import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runPacket() {
  const output = execFileSync("npm", ["run", "dev:doctor"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "development environment packet output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("development environment packet maps Mac handoff prerequisites", () => {
  const packet = runPacket();
  const checkKeys = packet.checks.map((check: { key: string }) => check.key);

  assert.equal(packet.purpose, "Check whether this checkout is ready for Charm ID development, MacBook Pro handoff, and App Store release prep.");
  assert.equal(packet.repository.remote, "https://github.com/abehikaruwcf-crypto/codex-cloud-app-20260624.git");
  assert.equal(packet.repository.branch, "main");
  assert.equal(packet.app.bundleId, "com.wcf.charmid");
  assert.equal(packet.macBookProHandoff, "outputs/macbook-pro-handoff.md");
  for (const key of [
    "node",
    "npm",
    "dependencies",
    "ios-project",
    "full-xcode-installed",
    "full-xcode-selected",
    "xcodebuild",
    "script:appstore:verify",
  ]) {
    assert.ok(checkKeys.includes(key), `${key} should be included`);
  }
  assert.equal(typeof packet.readyForWebDevelopment, "boolean");
  assert.equal(typeof packet.readyForAppStoreArchive, "boolean");
  assert.ok(packet.recommendedNextCommands.includes("npm run appstore:handoff"));
});
