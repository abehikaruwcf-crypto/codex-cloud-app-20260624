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

const packageJson = hasFile("package.json") ? JSON.parse(read("package.json")) : {};
const head = run("git", ["rev-parse", "HEAD"]);
const branch = run("git", ["branch", "--show-current"]);
const statusShort = run("git", ["status", "--short"]);
const xcode = run("xcodebuild", ["-version"]);
const releaseStatus = run("npm", ["run", "appstore:status"]);
const publicUrls = run("npm", ["run", "appstore:public-urls"]);
const parsedStatus = parseStatus(releaseStatus.output);
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
  xcode: {
    selected: xcode.ok && xcode.output.includes("Xcode"),
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
  evidenceTargets: {
    finalSignoff: "docs/app-review-final-signoff.md",
    testFlightChecklist: "docs/testflight-release-checklist.md",
    submissionPacket: "docs/app-store-submission-packet.md",
    privacyPage: "public/privacy.html",
    supportPage: "public/support.html",
  },
  nextStrictGate: "npm run appstore:verify -- --strict",
};

console.log(JSON.stringify(evidence, null, 2));
