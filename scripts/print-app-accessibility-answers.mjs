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

const accessibility = read("docs/app-accessibility-answers.md");

const packet = {
  generatedAt: new Date().toISOString(),
  sourceDoc: "docs/app-accessibility-answers.md",
  commonTasks: [
    "First launch",
    "Demo data load",
    "Six-angle registration",
    "Camera identification",
    "Candidate confirmation",
    "Backup export/import",
    "Local reset",
    "Support and Privacy links",
  ],
  currentRecommendation: section(accessibility, "## Current Recommendation"),
  releaseBuildTestNotes: section(accessibility, "## Release-Build Test Notes"),
  appStoreConnectGuidance: section(accessibility, "## App Store Connect Entry Guidance"),
};

const requiredValues = [
  ["currentRecommendation", packet.currentRecommendation],
  ["releaseBuildTestNotes", packet.releaseBuildTestNotes],
  ["appStoreConnectGuidance", packet.appStoreConnectGuidance],
];

for (const [label, value] of requiredValues) {
  if (!value) {
    throw new Error(`Missing Accessibility Nutrition Labels value: ${label}`);
  }
}

console.log(JSON.stringify(packet, null, 2));
