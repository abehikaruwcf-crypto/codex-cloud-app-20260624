import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runPacket() {
  const output = execFileSync("npm", ["run", "appstore:xcode-packet"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "Xcode packet output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("Xcode evidence packet maps archive prerequisites to signoff fields", () => {
  const packet = runPacket();
  const signoffKeys = packet.signoffFields.map((field: { key: string }) => field.key);

  assert.equal(packet.sourceDoc, "docs/xcode-app-store-upload-guide.md");
  assert.equal(packet.project.path, "ios/App/App.xcodeproj");
  assert.equal(packet.bundleId.expected, "com.wcf.charmid");
  assert.equal(typeof packet.readyForArchive, "boolean");
  assert.ok(packet.manualActions.includes("sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"));
  assert.ok(packet.manualActions.includes("open ios/App/App.xcodeproj"));
  assert.deepEqual(signoffKeys, ["app-store-connect-app-id", "uploaded-build", "strict-verification-result"]);
  assert.equal(packet.relatedCommands.strictGate, "npm run appstore:verify -- --strict");
});
