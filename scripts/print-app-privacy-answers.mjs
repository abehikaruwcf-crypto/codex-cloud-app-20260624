import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
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

const privacyAnswers = read("docs/app-privacy-answers.md");
const privacyManifest = read("ios/App/App/PrivacyInfo.xcprivacy");

const packet = {
  generatedAt: new Date().toISOString(),
  sourceDoc: "docs/app-privacy-answers.md",
  privacyManifest: "ios/App/App/PrivacyInfo.xcprivacy",
  appStoreConnectAnswers: {
    dataCollected: "No",
    tracking: "No",
    thirdPartyAdvertising: "No",
    trackingDomains: "None",
    dataLinkedToUser: "None",
    dataNotLinkedToUser: "None",
  },
  currentProductAssumption: section(privacyAnswers, "## Current Product Assumption"),
  privacyLabelDraft: section(privacyAnswers, "## App Privacy Label Draft"),
  manifestChecks: {
    trackingDeclaredFalse: privacyManifest.includes("<key>NSPrivacyTracking</key>") && privacyManifest.includes("<false/>"),
    collectedDataTypesEmpty: privacyManifest.includes("<key>NSPrivacyCollectedDataTypes</key>") && privacyManifest.includes("<array/>"),
    userDefaultsReasonDeclared: privacyManifest.includes("NSPrivacyAccessedAPICategoryUserDefaults") && privacyManifest.includes("CA92.1"),
  },
  requiredRecheckBeforeSubmission: section(privacyAnswers, "## Required Recheck Before Submission"),
};

const requiredValues = [
  ["currentProductAssumption", packet.currentProductAssumption],
  ["privacyLabelDraft", packet.privacyLabelDraft],
  ["requiredRecheckBeforeSubmission", packet.requiredRecheckBeforeSubmission],
];

for (const [label, value] of requiredValues) {
  if (!value) {
    throw new Error(`Missing App Privacy value: ${label}`);
  }
}

for (const [label, ok] of Object.entries(packet.manifestChecks)) {
  if (!ok) {
    throw new Error(`Privacy manifest check failed: ${label}`);
  }
}

console.log(JSON.stringify(packet, null, 2));
