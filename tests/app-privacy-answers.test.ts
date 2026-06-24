import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runPrivacyPacket() {
  const output = execFileSync("npm", ["run", "appstore:privacy"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "privacy packet output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("App Privacy packet maps local-only release answers", () => {
  const packet = runPrivacyPacket();

  assert.equal(packet.sourceDoc, "docs/app-privacy-answers.md");
  assert.equal(packet.privacyManifest, "ios/App/App/PrivacyInfo.xcprivacy");
  assert.equal(packet.appStoreConnectAnswers.dataCollected, "No");
  assert.equal(packet.appStoreConnectAnswers.tracking, "No");
  assert.equal(packet.appStoreConnectAnswers.thirdPartyAdvertising, "No");
  assert.equal(packet.appStoreConnectAnswers.dataLinkedToUser, "None");
  assert.equal(packet.appStoreConnectAnswers.dataNotLinkedToUser, "None");
  assert.match(packet.currentProductAssumption, /No cloud sync/);
  assert.match(packet.privacyLabelDraft, /Data Collected: No/);
});

test("App Privacy packet verifies the bundled iOS privacy manifest assumptions", () => {
  const packet = runPrivacyPacket();

  assert.deepEqual(packet.manifestChecks, {
    trackingDeclaredFalse: true,
    collectedDataTypesEmpty: true,
    userDefaultsReasonDeclared: true,
  });
  assert.match(packet.requiredRecheckBeforeSubmission, /Capacitor or WebKit dependencies/);
});
