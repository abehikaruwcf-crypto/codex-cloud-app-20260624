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

const ageRating = read("docs/app-age-rating-answers.md");

const packet = {
  generatedAt: new Date().toISOString(),
  sourceDoc: "docs/app-age-rating-answers.md",
  expectedRating: "4+",
  expectedRatingBasis: section(ageRating, "## Expected Rating"),
  questionnaireDraft: section(ageRating, "## Questionnaire Draft"),
  capabilityNotes: section(ageRating, "## Capability Notes"),
  finalReviewChecklist: section(ageRating, "## Final Review Checklist"),
};

const requiredValues = [
  ["expectedRatingBasis", packet.expectedRatingBasis],
  ["questionnaireDraft", packet.questionnaireDraft],
  ["capabilityNotes", packet.capabilityNotes],
  ["finalReviewChecklist", packet.finalReviewChecklist],
];

for (const [label, value] of requiredValues) {
  if (!value) {
    throw new Error(`Missing age rating value: ${label}`);
  }
}

console.log(JSON.stringify(packet, null, 2));
