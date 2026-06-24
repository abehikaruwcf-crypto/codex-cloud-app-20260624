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

function textFenceAfter(content, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedLabel}\\n\\n\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``, "m");
  const match = content.match(pattern);
  return match ? match[1].trim() : "";
}

function stripCodeFence(value) {
  return value.replace(/^```text\n/, "").replace(/\n```$/, "").trim();
}

const metadata = read("docs/app-store-metadata.md");
const submission = read("docs/app-store-submission-packet.md");
const releaseNotes = read("docs/release-notes.md");
const reviewAnswers = read("docs/app-store-review-answers.md");

const output = {
  identity: {
    appName: "Charm ID",
    bundleId: "com.wcf.charmid",
    sku: "charm-id-ios",
    primaryLanguage: "Japanese",
    category: "Business",
    secondaryCategory: "Productivity",
    ageRatingExpectation: "4+",
  },
  version: {
    marketingVersion: "1.0",
    buildNumber: "1",
    releaseType: "Manual release after App Review approval",
  },
  japaneseListing: {
    appName: section(metadata, "### App Name"),
    subtitle: section(metadata, "### Subtitle"),
    promotionalText: section(metadata, "### Promotional Text"),
    description: section(metadata, "### Description"),
    keywords: section(metadata, "### Keywords"),
    whatsNew: section(metadata, "### What's New"),
  },
  review: {
    notes: textFenceAfter(reviewAnswers, "- Notes for reviewer:"),
    signInRequired: "No",
    demoAccountRequired: "No",
  },
  releaseNotes: {
    appStoreWhatsNew: stripCodeFence(section(releaseNotes, "### App Store What's New Draft")),
    testFlightNotes: stripCodeFence(section(releaseNotes, "### TestFlight Notes Draft")),
  },
  sourceDocs: [
    "docs/app-store-submission-packet.md",
    "docs/app-store-metadata.md",
    "docs/app-store-review-answers.md",
    "docs/release-notes.md",
  ],
};

if (!submission.includes("Primary language: Japanese")) {
  throw new Error("Submission packet primary language is not Japanese.");
}

const requiredFields = [
  ["identity.bundleId", output.identity.bundleId],
  ["japaneseListing.appName", output.japaneseListing.appName],
  ["japaneseListing.subtitle", output.japaneseListing.subtitle],
  ["japaneseListing.promotionalText", output.japaneseListing.promotionalText],
  ["japaneseListing.description", output.japaneseListing.description],
  ["japaneseListing.keywords", output.japaneseListing.keywords],
  ["japaneseListing.whatsNew", output.japaneseListing.whatsNew],
  ["review.notes", output.review.notes],
  ["releaseNotes.appStoreWhatsNew", output.releaseNotes.appStoreWhatsNew],
  ["releaseNotes.testFlightNotes", output.releaseNotes.testFlightNotes],
];

for (const [field, value] of requiredFields) {
  if (!value) {
    throw new Error(`Missing App Store metadata field: ${field}`);
  }
}

console.log(JSON.stringify(output, null, 2));
