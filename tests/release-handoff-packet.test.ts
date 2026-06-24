import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runHandoffPacket() {
  const output = execFileSync("npm", ["run", "appstore:handoff"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "handoff output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("release handoff packet maps remaining release work to owners and inputs", () => {
  const packet = runHandoffPacket();

  assert.equal(packet.release.appName, "Charm ID");
  assert.equal(packet.release.bundleId, "com.wcf.charmid");
  assert.equal(packet.currentGate.todo, 5);
  assert.deepEqual(
    packet.currentGate.todoItems.map((item: { title: string }) => item.title),
    [
      "Formal support contact",
      "Privacy policy contact",
      "App Store copyright holder",
      "Final App Review signoff",
      "Full Xcode selected",
    ],
  );
  assert.deepEqual(
    packet.requiredManualWork.map((item: { owner: string }) => item.owner),
    ["Release owner", "Xcode/App Store Connect operator", "QA tester", "App Store Connect operator"],
  );
});

test("release handoff packet includes final input template and strict verification path", () => {
  const packet = runHandoffPacket();

  assert.equal(packet.releaseInputs.saveAs, "release-inputs.json");
  assert.ok(packet.releaseInputs.placeholders.includes("support-contact"));
  assert.ok(packet.releaseInputs.placeholders.includes("copyright-holder"));
  assert.ok(packet.releaseInputs.template["privacy-url"].endsWith("/privacy.html"));
  assert.ok(packet.requiredManualWork[1].inputs.includes("uploaded-build"));
  assert.ok(packet.requiredManualWork[2].inputs.includes("backup-validation-result"));
  assert.equal(packet.requiredManualWork[3].privacyAnswers.dataCollected, "No");
  assert.ok(packet.verification.includes("npm run appstore:verify -- --strict"));
});
