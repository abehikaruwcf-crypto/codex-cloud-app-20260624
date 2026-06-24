import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runTemplate() {
  const output = execFileSync("npm", ["run", "appstore:signoff-template"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "release input template output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("release input template maps final signoff values to apply-inputs JSON", () => {
  const packet = runTemplate();

  assert.equal(packet.saveAs, "release-inputs.json");
  assert.equal(packet.validateCommand, "npm run appstore:validate-inputs -- release-inputs.json");
  assert.equal(packet.applyCommand, "npm run appstore:apply-inputs -- --inputs-file release-inputs.json");
  assert.equal(packet.readyCommand, "npm run appstore:apply-inputs -- --inputs-file release-inputs.json --mark-ready");
  assert.equal(packet.template["privacy-url"], "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html");
  assert.equal(packet.template["support-url"], "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html");
  assert.equal(packet.template["copyright-holder"], "<copyright-holder>");
  assert.equal(packet.template["mark-ready"], false);
  assert.ok(packet.placeholders.includes("support-contact"));
  assert.ok(packet.placeholders.includes("app-store-connect-app-id"));
  assert.ok(packet.placeholders.includes("copyright-holder"));
  assert.ok(packet.sourcePackets.xcode.signoffFields.includes("uploaded-build"));
  assert.ok(packet.sourcePackets.testflight.evidenceFields.includes("backup-validation-result"));
});
