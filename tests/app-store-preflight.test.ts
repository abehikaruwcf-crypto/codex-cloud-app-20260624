import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
let cachedPreflight: any;

function runPreflight() {
  if (cachedPreflight) {
    return cachedPreflight;
  }

  const output = execFileSync("npm", ["run", "appstore:preflight"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "preflight output should include a JSON object");

  cachedPreflight = JSON.parse(output.slice(jsonStart));
  return cachedPreflight;
}

test("App Store preflight stays parseable and reports the current manual gate", () => {
  const preflight = runPreflight();

  assert.equal(preflight.release.appName, "Charm ID");
  assert.equal(preflight.release.bundleId, "com.wcf.charmid");
  assert.equal(preflight.commands.hardGate, "npm run appstore:verify");
  assert.equal(preflight.commands.strictGate, "npm run appstore:verify -- --strict");
  assert.equal(preflight.commands.submissionChecklist, "npm run appstore:submission-checklist");
  assert.equal(preflight.commands.screenshotPacket, "npm run appstore:screenshot-packet");
  assert.equal(preflight.commands.xcodePacket, "npm run appstore:xcode-packet");
  assert.equal(preflight.commands.testflightPacket, "npm run appstore:testflight-packet");
  assert.equal(preflight.commands.signoffCommand, "npm run appstore:signoff-command");
  assert.equal(preflight.commands.signoffTemplate, "npm run appstore:signoff-template");
  assert.equal(preflight.releaseStatus.todo, 4);
  assert.equal(preflight.releaseStatus.expectedManualTodoCount, 4);
  assert.equal(preflight.manualGate.readyForAppReview, false);
  assert.deepEqual(preflight.manualGate.remainingActions, [
    "Formal support contact",
    "Privacy policy contact",
    "Final App Review signoff",
    "Full Xcode selected",
  ]);
});

test("App Store preflight confirms every submission packet substep", () => {
  const preflight = runPreflight();
  const stepNames = preflight.steps.map((step) => step.name);

  assert.deepEqual(stepNames, [
    "Metadata",
    "App Store Connect transfer packet",
    "App Store Connect submission checklist",
    "Age rating answers",
    "Accessibility answers",
    "Screenshot evidence packet",
    "Xcode evidence packet",
    "TestFlight evidence packet",
    "Public URL verification",
    "App Review signoff draft",
    "Final signoff apply command",
    "Final signoff input template",
  ]);

  for (const step of preflight.steps) {
    assert.equal(step.ok, true, `${step.name} should pass`);
    assert.deepEqual(step.missingExpected, [], `${step.name} should include all expected output markers`);
  }
});
