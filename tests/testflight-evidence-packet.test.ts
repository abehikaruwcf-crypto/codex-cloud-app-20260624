import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runPacket() {
  const output = execFileSync("npm", ["run", "appstore:testflight-packet"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "TestFlight packet output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("TestFlight evidence packet maps physical QA to signoff fields", () => {
  const packet = runPacket();
  const keys = packet.evidenceFields.map((field: { key: string }) => field.key);

  assert.equal(packet.sourceDoc, "docs/testflight-release-checklist.md");
  assert.equal(packet.backupValidationCommand, "npm run backup:validate -- <exported-backup.json>");
  assert.deepEqual(keys, [
    "testflight-device",
    "backup-validation-file",
    "backup-validation-result",
    "backup-import-result",
    "accessibility-label-result",
    "age-rating-result",
  ]);
  assert.ok(packet.qaTasks.includes("Six-angle registration"));
  assert.ok(packet.qaTasks.includes("Camera permission denial and retry path"));
  assert.match(packet.signoffCommandFragment, /--testflight-device '<testflight-device>'/);
  assert.match(packet.signoffCommandFragment, /--backup-validation-result '<backup-validation-result>'/);
});
