import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
let cachedEvidence: any;

function runEvidence() {
  if (cachedEvidence) {
    return cachedEvidence;
  }

  const output = execFileSync("npm", ["run", "appstore:evidence"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "release evidence output should include a JSON object");

  cachedEvidence = JSON.parse(output.slice(jsonStart));
  return cachedEvidence;
}

test("release evidence exposes final signoff readiness and missing fields", () => {
  const evidence = runEvidence();

  assert.equal(evidence.finalSignoff.path, "docs/app-review-final-signoff.md");
  assert.equal(evidence.finalSignoff.exists, true);
  assert.equal(evidence.finalSignoff.status, "Pending");
  assert.equal(evidence.finalSignoff.ready, false);
  assert.ok(evidence.finalSignoff.missingFields.includes("Release commit"));
  assert.ok(evidence.finalSignoff.missingFields.includes("Support contact"));
  assert.ok(evidence.finalSignoff.filledFields.includes("Final Privacy Policy URL"));
  assert.ok(evidence.finalSignoff.filledFields.includes("Final Support URL"));
});

test("release evidence includes hosted page sources and the current manual gate", () => {
  const evidence = runEvidence();

  assert.equal(evidence.evidenceTargets.bundledPrivacyPage, "public/privacy.html");
  assert.equal(evidence.evidenceTargets.bundledSupportPage, "public/support.html");
  assert.equal(evidence.evidenceTargets.hostedPrivacyPageSource, "docs/privacy.html");
  assert.equal(evidence.evidenceTargets.hostedSupportPageSource, "docs/support.html");
  assert.equal(evidence.releaseStatus.todo, 4);
  assert.equal(evidence.publishing.publicUrlsReachable, true);
  assert.equal(evidence.nextStrictGate, "npm run appstore:verify -- --strict");
});
