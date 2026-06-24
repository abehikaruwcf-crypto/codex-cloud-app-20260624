import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

function section(content, heading) {
  const level = heading.match(/^#+/)?.[0].length ?? 1;
  const lines = content.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);

  if (start === -1) {
    return "";
  }

  const body = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const headingMatch = line.match(/^(#+) /);

    if (headingMatch && headingMatch[1].length <= level) {
      break;
    }

    body.push(line);
  }

  return body.join("\n").trim();
}

function stripCodeFence(value) {
  return value.replace(/^```text\n/, "").replace(/\n```$/, "").trim();
}

function findRequiredUrl(content, kind) {
  const urls = [...new Set([...content.matchAll(/https:\/\/[^\s`)]+\/(?:privacy|support)\.html/g)].map((match) => match[0]))];
  const url = urls.find((candidate) => candidate.endsWith(`/${kind}.html`));

  if (!url) {
    throw new Error(`Missing ${kind}.html public URL in docs/github-pages-workflow.md`);
  }

  return url;
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
    todoItems: checks.filter((check) => check.status === "TODO"),
  };
}

function screenshotManifest() {
  const screenshotDir = join(root, "outputs/app-store-screenshots");

  if (!existsSync(screenshotDir)) {
    return [];
  }

  return readdirSync(screenshotDir)
    .filter((name) => name.endsWith(".jpg"))
    .sort()
    .map((name) => ({
      file: `outputs/app-store-screenshots/${name}`,
      sizeBytes: statSync(join(screenshotDir, name)).size,
      purpose:
        {
          "01-onboarding.jpg": "Onboarding and demo start",
          "02-library.jpg": "Library detail with registered examples",
          "03-identify.jpg": "Identification capture",
          "04-register.jpg": "Six-angle registration",
          "05-learning.jpg": "Candidate confirmation and learning",
        }[name] ?? "App Store screenshot",
    }));
}

const packageJson = JSON.parse(read("package.json"));
const metadataResult = run("npm", ["run", "appstore:metadata"]);
const publicUrlsResult = run("npm", ["run", "appstore:public-urls"]);
const statusResult = run("npm", ["run", "appstore:status"]);
const metadata = metadataResult.ok ? JSON.parse(metadataResult.output.slice(metadataResult.output.indexOf("{"))) : null;
const releaseNotes = read("docs/release-notes.md");
const ageRatingAnswers = read("docs/app-age-rating-answers.md");
const privacyAnswers = read("docs/app-privacy-answers.md");
const accessibilityAnswers = read("docs/app-accessibility-answers.md");
const reviewAnswers = read("docs/app-store-review-answers.md");
const pagesNotes = read("docs/github-pages-workflow.md");
const parsedStatus = parseStatus(statusResult.output);

if (!metadataResult.ok) {
  throw new Error(`Could not print App Store metadata:\n${metadataResult.output}`);
}

const packet = {
  generatedAt: new Date().toISOString(),
  release: {
    packageVersion: packageJson.version,
    marketingVersion: metadata.version.marketingVersion,
    buildNumber: metadata.version.buildNumber,
    releaseType: metadata.version.releaseType,
  },
  appRecord: {
    name: metadata.identity.appName,
    bundleId: metadata.identity.bundleId,
    sku: metadata.identity.sku,
    primaryLanguage: metadata.identity.primaryLanguage,
    category: metadata.identity.category,
    secondaryCategory: metadata.identity.secondaryCategory,
    ageRatingExpectation: metadata.identity.ageRatingExpectation,
  },
  urls: {
    privacyPolicy: findRequiredUrl(pagesNotes, "privacy"),
    support: findRequiredUrl(pagesNotes, "support"),
    verificationCommand: "npm run appstore:public-urls",
    verificationPassed: publicUrlsResult.ok,
    verificationOutput: publicUrlsResult.ok ? publicUrlsResult.output : null,
    verificationError: publicUrlsResult.ok ? null : publicUrlsResult.output,
  },
  appStoreListing: {
    appName: metadata.japaneseListing.appName,
    subtitle: metadata.japaneseListing.subtitle,
    promotionalText: metadata.japaneseListing.promotionalText,
    description: metadata.japaneseListing.description,
    keywords: metadata.japaneseListing.keywords,
    whatsNew: metadata.japaneseListing.whatsNew,
  },
  appReview: {
    signInRequired: metadata.review.signInRequired,
    demoAccountRequired: metadata.review.demoAccountRequired,
    notes: metadata.review.notes,
    ageRating: {
      expectedRating: metadata.identity.ageRatingExpectation,
      answers: "docs/app-age-rating-answers.md",
      questionnaireDraft: section(ageRatingAnswers, "## Questionnaire Draft"),
      capabilityNotes: section(ageRatingAnswers, "## Capability Notes"),
    },
    exportCompliance: "No custom cryptography; confirm final App Store Connect answers before submission.",
    contentRights: section(reviewAnswers, "## Content Rights Draft"),
  },
  testFlight: {
    notes: metadata.releaseNotes.testFlightNotes,
    checklist: "docs/testflight-release-checklist.md",
  },
  privacy: {
    appPrivacyAnswers: "docs/app-privacy-answers.md",
    privacyManifest: "ios/App/App/PrivacyInfo.xcprivacy",
    currentProductAssumption: section(privacyAnswers, "## Current Product Assumption"),
    privacyLabelDraft: section(privacyAnswers, "## App Privacy Label Draft"),
  },
  accessibility: {
    answers: "docs/app-accessibility-answers.md",
    currentRecommendation: section(accessibilityAnswers, "## Current Recommendation"),
    appStoreConnectGuidance: section(accessibilityAnswers, "## App Store Connect Entry Guidance"),
  },
  screenshots: {
    finalCaptureRequired: true,
    developmentManifest: screenshotManifest(),
    instructions: "Final App Store screenshots must be captured from the release build at Apple-supported sizes.",
  },
  releaseGate: {
    command: "npm run appstore:status",
    pass: parsedStatus.pass,
    todo: parsedStatus.todo,
    todoItems: parsedStatus.todoItems,
    strictCommand: "npm run appstore:verify -- --strict",
  },
  sourceDocs: [
    "docs/app-store-submission-packet.md",
    "docs/app-store-metadata.md",
    "docs/app-store-review-answers.md",
    "docs/app-age-rating-answers.md",
    "docs/app-privacy-answers.md",
    "docs/app-accessibility-answers.md",
    "docs/release-notes.md",
    "docs/app-review-final-signoff.md",
  ],
};

const requiredValues = [
  ["appRecord.name", packet.appRecord.name],
  ["appRecord.bundleId", packet.appRecord.bundleId],
  ["urls.privacyPolicy", packet.urls.privacyPolicy],
  ["urls.support", packet.urls.support],
  ["appStoreListing.subtitle", packet.appStoreListing.subtitle],
  ["appStoreListing.description", packet.appStoreListing.description],
  ["appReview.notes", packet.appReview.notes],
  ["testFlight.notes", packet.testFlight.notes],
];

for (const [label, value] of requiredValues) {
  if (!value) {
    throw new Error(`Missing App Store Connect packet value: ${label}`);
  }
}

console.log(JSON.stringify(packet, null, 2));
