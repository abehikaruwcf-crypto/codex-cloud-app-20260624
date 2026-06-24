import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runChecklist() {
  const output = execFileSync("npm", ["run", "appstore:submission-checklist"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "submission checklist output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("App Store submission checklist maps Connect packet into screen order", () => {
  const checklist = runChecklist();
  const screenNames = checklist.screens.map((screen: { screen: string }) => screen.screen);

  assert.equal(checklist.sourcePacket, "npm run appstore:connect-packet");
  assert.equal(checklist.appRecord.bundleId, "com.wcf.charmid");
  assert.deepEqual(screenNames, [
    "App Information",
    "App Privacy",
    "Age Rating",
    "Version Information",
    "Build",
    "Screenshots",
    "App Review Information",
    "TestFlight",
    "Final Signoff",
  ]);
  assert.ok(checklist.remainingManualScreens.includes("Build"));
  assert.ok(checklist.remainingManualScreens.includes("TestFlight"));
  assert.equal(checklist.finalGate.strictCommand, "npm run appstore:verify -- --strict");
});

test("App Store submission checklist preserves critical listing and review values", () => {
  const checklist = runChecklist();
  const privacy = checklist.screens.find((screen: { screen: string }) => screen.screen === "App Privacy");
  const version = checklist.screens.find((screen: { screen: string }) => screen.screen === "Version Information");
  const review = checklist.screens.find((screen: { screen: string }) => screen.screen === "App Review Information");
  const screenshots = checklist.screens.find((screen: { screen: string }) => screen.screen === "Screenshots");

  assert.equal(privacy.fields.dataCollected, "No");
  assert.equal(privacy.fields.tracking, "No");
  assert.equal(privacy.fields.manifestChecks.trackingDeclaredFalse, true);
  assert.equal(version.fields.supportUrl, "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html");
  assert.equal(version.fields.copyright, "<copyright-holder>");
  assert.equal(version.fields.keywords, "管理番号,小物,チャーム,アクセサリー,部品,在庫,カメラ,識別");
  assert.match(review.fields.notes, /Charm ID can be used without login/);
  assert.equal(screenshots.fields.profiles.length, 2);
});
