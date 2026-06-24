import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runSignoffCommandPacket() {
  const output = execFileSync("npm", ["run", "appstore:signoff-command"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "signoff command output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("release signoff command packet keeps placeholders explicit", () => {
  const packet = runSignoffCommandPacket();

  assert.equal(packet.readyToUse, false);
  assert.equal(packet.purpose, "Fill final App Review signoff evidence after manual release checks are complete.");
  assert.match(packet.command, /^npm run appstore:apply-inputs -- /);
  assert.match(packet.command, /--privacy-url https:\/\/abehikaruwcf-crypto\.github\.io\/codex-cloud-app-20260624\/privacy\.html/);
  assert.match(packet.command, /--support-url https:\/\/abehikaruwcf-crypto\.github\.io\/codex-cloud-app-20260624\/support\.html/);
  assert.match(packet.command, /--public-url-verification-result 'passed with npm run appstore:public-urls'/);
  assert.match(packet.command, /--strict-verification-result '<result of npm run appstore:verify -- --strict>'/);
  assert.match(packet.command, /--mark-ready$/);
  assert.deepEqual(packet.replacePlaceholdersBeforeUse, [
    "support-contact",
    "privacy-contact",
    "app-store-connect-app-id",
    "uploaded-build",
    "testflight-device",
    "backup-validation-file",
    "backup-validation-result",
    "backup-import-result",
    "strict-verification-result",
    "accessibility-label-result",
    "age-rating-result",
    "signoff-owner",
    "signoff-date",
  ]);
});
