import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function hasFile(path) {
  return existsSync(join(root, path));
}

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim(),
    };
  }
}

function uniqueMatches(content, pattern) {
  return [...new Set([...content.matchAll(pattern)].map((match) => match[1]))];
}

function parseStatus(output) {
  const checks = output
    .split("\n")
    .map((line) => line.match(/^\[(PASS|TODO)\] ([^:]+): (.*)$/))
    .filter(Boolean)
    .map((match) => ({
      status: match[1],
      title: match[2],
      detail: match[3],
    }));

  const summary = output.match(/Status summary: (\d+) pass, (\d+) todo/);

  return {
    pass: summary ? Number(summary[1]) : checks.filter((check) => check.status === "PASS").length,
    todo: summary ? Number(summary[2]) : checks.filter((check) => check.status === "TODO").length,
    checks,
  };
}

function parseJsonOutput(output) {
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    return null;
  }

  try {
    return JSON.parse(output.slice(jsonStart));
  } catch {
    return null;
  }
}

function remoteBranch(branch) {
  const result = run("git", ["ls-remote", "--heads", "origin", branch]);
  const sha = result.output.split(/\s+/)[0] || null;

  return {
    exists: result.ok && Boolean(sha),
    sha,
  };
}

function iosVersionEvidence() {
  if (!hasFile("ios/App/App.xcodeproj/project.pbxproj")) {
    return {
      marketingVersions: [],
      buildNumbers: [],
    };
  }

  const project = read("ios/App/App.xcodeproj/project.pbxproj");

  return {
    marketingVersions: uniqueMatches(project, /MARKETING_VERSION = ([^;]+);/g),
    buildNumbers: uniqueMatches(project, /CURRENT_PROJECT_VERSION = ([^;]+);/g),
  };
}

function signoffValue(content, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^- ${escapedLabel}:[^\\S\\r\\n]*(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function finalSignoffEvidence() {
  const path = "docs/app-review-final-signoff.md";
  if (!hasFile(path)) {
    return {
      path,
      exists: false,
      status: null,
      ready: false,
      missingFields: [],
      filledFields: [],
    };
  }

  const content = read(path);
  const status = content.match(/^Status:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const requiredFields = [
    "Release commit",
    "Evidence report generated",
    "App Store Connect app ID",
    "Uploaded build",
    "TestFlight device",
    "Backup validation file",
    "Backup validation result",
    "Backup import result",
    "Public URL verification result",
    "Strict verification result",
    "Accessibility label result",
    "Age rating result",
    "Final Privacy Policy URL",
    "Final Support URL",
    "Support contact",
    "Privacy contact",
    "Copyright holder",
    "Signoff owner",
    "Signoff date",
  ];
  const filledFields = requiredFields.filter((field) => Boolean(signoffValue(content, field)));
  const missingFields = requiredFields.filter((field) => !filledFields.includes(field));

  return {
    path,
    exists: true,
    status,
    ready: status === "Ready for App Review" && missingFields.length === 0,
    missingFields,
    filledFields,
  };
}

const packageJson = hasFile("package.json") ? JSON.parse(read("package.json")) : {};
const head = run("git", ["rev-parse", "HEAD"]);
const branch = run("git", ["branch", "--show-current"]);
const statusShort = run("git", ["status", "--short"]);
const xcode = run("xcodebuild", ["-version"]);
const releaseStatus = run("npm", ["run", "appstore:status"]);
const publicUrls = run("npm", ["run", "appstore:public-urls"]);
const privacyPacket = run("npm", ["run", "appstore:privacy"]);
const screenshotPacket = run("npm", ["run", "appstore:screenshot-packet"]);
const xcodePacket = run("npm", ["run", "appstore:xcode-packet"]);
const parsedStatus = parseStatus(releaseStatus.output);
const parsedPrivacyPacket = parseJsonOutput(privacyPacket.output);
const parsedScreenshotPacket = parseJsonOutput(screenshotPacket.output);
const parsedXcodePacket = parseJsonOutput(xcodePacket.output);
const pagesNotes = hasFile("docs/github-pages-workflow.md")
  ? read("docs/github-pages-workflow.md")
  : "";

const evidence = {
  generatedAt: new Date().toISOString(),
  repository: {
    branch: branch.output || null,
    head: head.output || null,
    workingTreeClean: statusShort.ok && statusShort.output.length === 0,
    remoteMain: remoteBranch("main"),
    remoteGhPages: remoteBranch("gh-pages"),
  },
  app: {
    name: "Charm ID",
    packageVersion: packageJson.version ?? null,
    bundleId: "com.wcf.charmid",
    ios: iosVersionEvidence(),
  },
  releaseStatus: {
    command: "npm run appstore:status",
    exitOk: releaseStatus.ok,
    pass: parsedStatus.pass,
    todo: parsedStatus.todo,
    todoItems: parsedStatus.checks.filter((check) => check.status === "TODO"),
  },
  finalSignoff: finalSignoffEvidence(),
  xcode: {
    command: "npm run appstore:xcode-packet",
    packetGenerated: xcodePacket.ok && Boolean(parsedXcodePacket),
    selected: parsedXcodePacket?.xcode?.fullXcodeSelected ?? (xcode.ok && xcode.output.includes("Xcode")),
    readyForArchive: parsedXcodePacket?.readyForArchive ?? false,
    selectedDeveloperPath: parsedXcodePacket?.xcode?.selectedDeveloperPath ?? null,
    expectedDeveloperPath: parsedXcodePacket?.xcode?.expectedDeveloperPath ?? null,
    projectPath: parsedXcodePacket?.project?.path ?? null,
    bundleIdConfigured: parsedXcodePacket?.bundleId?.configured ?? null,
    signoffFields: parsedXcodePacket?.signoffFields ?? [],
    output: xcode.output,
  },
  publishing: {
    ghPagesBranchReady: remoteBranch("gh-pages").exists,
    currentPrivatePagesPlanBlocked: pagesNotes.includes(
      "does not support GitHub Pages for this repository",
    ),
    hostedUrlPlaceholdersRemain:
      pagesNotes.includes("https://<owner>.github.io/<repo>/privacy.html") ||
      pagesNotes.includes("https://<owner>.github.io/<repo>/support.html"),
    publicUrlsReachable: publicUrls.ok,
    publicUrlCheckOutput: publicUrls.output,
  },
  privacy: {
    command: "npm run appstore:privacy",
    packetGenerated: privacyPacket.ok && Boolean(parsedPrivacyPacket),
    sourceDoc: parsedPrivacyPacket?.sourceDoc ?? null,
    privacyManifest: parsedPrivacyPacket?.privacyManifest ?? null,
    appStoreConnectAnswers: parsedPrivacyPacket?.appStoreConnectAnswers ?? null,
    manifestChecks: parsedPrivacyPacket?.manifestChecks ?? null,
  },
  screenshots: {
    command: "npm run appstore:screenshot-packet",
    packetGenerated: screenshotPacket.ok && Boolean(parsedScreenshotPacket),
    ready: parsedScreenshotPacket?.ready === true,
    sourceDoc: parsedScreenshotPacket?.sourceDoc ?? null,
    generationCommand: parsedScreenshotPacket?.generationCommand ?? null,
    profiles:
      parsedScreenshotPacket?.profiles?.map((profile) => ({
        key: profile.key,
        label: profile.label,
        expectedSize: profile.expectedSize,
        ready: profile.ready,
        missing: profile.missing,
        invalid: profile.invalid,
        files: profile.files?.map((file) => ({
          file: file.file,
          path: file.path,
          ok: file.ok,
          exists: file.exists,
          bytes: file.bytes,
        })),
      })) ?? [],
  },
  evidenceTargets: {
    finalSignoff: "docs/app-review-final-signoff.md",
    testFlightChecklist: "docs/testflight-release-checklist.md",
    submissionPacket: "docs/app-store-submission-packet.md",
    privacyPacket: "npm run appstore:privacy",
    privacyDoc: "docs/app-privacy-answers.md",
    privacyManifest: "ios/App/App/PrivacyInfo.xcprivacy",
    screenshotPacket: "npm run appstore:screenshot-packet",
    xcodePacket: "npm run appstore:xcode-packet",
    screenshotDoc: "docs/app-store-screenshots.md",
    bundledPrivacyPage: "public/privacy.html",
    bundledSupportPage: "public/support.html",
    hostedPrivacyPageSource: "docs/privacy.html",
    hostedSupportPageSource: "docs/support.html",
  },
  nextStrictGate: "npm run appstore:verify -- --strict",
};

console.log(JSON.stringify(evidence, null, 2));
