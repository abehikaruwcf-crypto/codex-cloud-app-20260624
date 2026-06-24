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

function characterCount(value) {
  return [...value].length;
}

function byteCount(value) {
  return Buffer.byteLength(value, "utf8");
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
  fieldLimits: {
    appName: {
      usedCharacters: 0,
      maxCharacters: 30,
    },
    subtitle: {
      usedCharacters: 0,
      maxCharacters: 30,
    },
    promotionalText: {
      usedCharacters: 0,
      maxCharacters: 170,
    },
    description: {
      usedCharacters: 0,
      maxCharacters: 4000,
    },
    keywords: {
      usedBytes: 0,
      maxBytes: 100,
    },
    whatsNew: {
      usedCharacters: 0,
      maxCharacters: 4000,
    },
  },
  sourceDocs: [
    "docs/app-store-submission-packet.md",
    "docs/app-store-metadata.md",
    "docs/app-store-review-answers.md",
    "docs/release-notes.md",
  ],
};

output.fieldLimits.appName.usedCharacters = characterCount(output.japaneseListing.appName);
output.fieldLimits.subtitle.usedCharacters = characterCount(output.japaneseListing.subtitle);
output.fieldLimits.promotionalText.usedCharacters = characterCount(output.japaneseListing.promotionalText);
output.fieldLimits.description.usedCharacters = characterCount(output.japaneseListing.description);
output.fieldLimits.keywords.usedBytes = byteCount(output.japaneseListing.keywords);
output.fieldLimits.whatsNew.usedCharacters = characterCount(output.japaneseListing.whatsNew);

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

const limitChecks = [
  ["japaneseListing.appName", output.fieldLimits.appName.usedCharacters, output.fieldLimits.appName.maxCharacters, "characters"],
  ["japaneseListing.subtitle", output.fieldLimits.subtitle.usedCharacters, output.fieldLimits.subtitle.maxCharacters, "characters"],
  [
    "japaneseListing.promotionalText",
    output.fieldLimits.promotionalText.usedCharacters,
    output.fieldLimits.promotionalText.maxCharacters,
    "characters",
  ],
  [
    "japaneseListing.description",
    output.fieldLimits.description.usedCharacters,
    output.fieldLimits.description.maxCharacters,
    "characters",
  ],
  ["japaneseListing.keywords", output.fieldLimits.keywords.usedBytes, output.fieldLimits.keywords.maxBytes, "bytes"],
  [
    "japaneseListing.whatsNew",
    output.fieldLimits.whatsNew.usedCharacters,
    output.fieldLimits.whatsNew.maxCharacters,
    "characters",
  ],
];

for (const [field, used, max, unit] of limitChecks) {
  if (used > max) {
    throw new Error(`App Store metadata field ${field} is ${used}/${max} ${unit}.`);
  }
}

console.log(JSON.stringify(output, null, 2));
