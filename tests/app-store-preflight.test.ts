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
  assert.equal(preflight.commands.connectFields, "npm run appstore:connect-fields");
  assert.equal(preflight.commands.privacyPacket, "npm run appstore:privacy");
  assert.equal(preflight.commands.screenshotPacket, "npm run appstore:screenshot-packet");
  assert.equal(preflight.commands.xcodePacket, "npm run appstore:xcode-packet");
  assert.equal(preflight.commands.testflightPacket, "npm run appstore:testflight-packet");
  assert.equal(preflight.commands.handoffPacket, "npm run appstore:handoff");
  assert.equal(preflight.commands.signoffCommand, "npm run appstore:signoff-command");
  assert.equal(preflight.commands.signoffTemplate, "npm run appstore:signoff-template");
  assert.equal(preflight.commands.validateInputs, "npm run appstore:validate-inputs -- release-inputs.json");
  assert.ok([4, 5].includes(preflight.releaseStatus.todo), "manual TODO count should tolerate Xcode availability");
  assert.equal(preflight.releaseStatus.expectedManualTodoCount, preflight.releaseStatus.todo);
  assert.deepEqual(preflight.releaseStatus.environmentSensitiveTodoItems, ["Full Xcode selected"]);
  assert.equal(preflight.manualGate.readyForAppReview, false);
  for (const action of [
    "Formal support contact",
    "Privacy policy contact",
    "App Store copyright holder",
    "Final App Review signoff",
  ]) {
    assert.ok(preflight.manualGate.remainingActions.includes(action), `${action} should remain blocked`);
  }
});

test("App Store preflight confirms every submission packet substep", () => {
  const preflight = runPreflight();
  const stepNames = preflight.steps.map((step) => step.name);

  assert.deepEqual(stepNames, [
    "Metadata",
    "App Store Connect transfer packet",
    "App Store Connect submission checklist",
    "App Store Connect field copy map",
    "App Privacy answers",
    "Age rating answers",
    "Accessibility answers",
    "Screenshot evidence packet",
    "Xcode evidence packet",
    "TestFlight evidence packet",
    "Release handoff packet",
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
