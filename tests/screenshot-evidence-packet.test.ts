import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runPacket() {
  const output = execFileSync("npm", ["run", "appstore:screenshot-packet"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "screenshot packet output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("screenshot evidence packet maps App Store image sets", () => {
  const packet = runPacket();
  const profileKeys = packet.profiles.map((profile: { key: string }) => profile.key);

  assert.equal(packet.sourceDoc, "docs/app-store-screenshots.md");
  assert.equal(packet.generationCommand, "npm run appstore:screenshots:submission");
  assert.deepEqual(profileKeys, ["iphone-6-9", "iphone-6-5"]);

  for (const profile of packet.profiles) {
    assert.equal(profile.files.length, 5);
    assert.match(profile.expectedSize, /^\d+x\d+$/);
    assert.deepEqual(
      profile.files.map((file: { file: string }) => file.file),
      ["01-onboarding.jpg", "02-library.jpg", "03-identify.jpg", "04-register.jpg", "05-learning.jpg"],
    );
  }
});
