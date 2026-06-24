import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function runValidator(inputPath: string) {
  try {
    const output = execFileSync("npm", ["run", "appstore:validate-inputs", "--", inputPath], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const jsonStart = output.indexOf("{");

    assert.notEqual(jsonStart, -1, "validator output should include JSON");
    return { ok: true, packet: JSON.parse(output.slice(jsonStart)), output };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    const jsonStart = output.indexOf("{");

    return {
      ok: false,
      packet: jsonStart === -1 ? null : JSON.parse(output.slice(jsonStart)),
      output,
    };
  }
}

function writeInputs(root: string, values: Record<string, unknown>) {
  const path = join(root, "release-inputs.json");
  writeFileSync(path, JSON.stringify(values, null, 2));
  return path;
}

const validInputs = {
  "support-contact": "support@example.com",
  "privacy-contact": "privacy@example.com",
  "copyright-holder": "WCF Inc.",
  "privacy-url": "https://example.com/privacy.html",
  "support-url": "https://example.com/support.html",
  "release-commit": "abc1234",
  "evidence-report-generated": "2026-06-25T00:00:00Z",
  "app-store-connect-app-id": "1234567890",
  "uploaded-build": "1.0 (1)",
  "testflight-device": "iPhone 15 Pro / iOS 18",
  "backup-validation-file": "charm-id-backup-2026-06-25.json",
  "backup-validation-result": "passed",
  "backup-import-result": "passed on physical iPhone",
  "public-url-verification-result": "passed with npm run appstore:public-urls",
  "strict-verification-result": "passed with npm run appstore:verify -- --strict",
  "accessibility-label-result": "reviewed against physical iPhone test",
  "age-rating-result": "4+ confirmed in App Store Connect",
  "signoff-owner": "Release owner",
  "signoff-date": "2026-06-25",
  "mark-ready": false,
};

test("release input validator accepts complete final inputs", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "charm-id-input-validator-"));

  try {
    const inputPath = writeInputs(tempRoot, validInputs);
    const result = runValidator(inputPath);

    assert.equal(result.ok, true);
    assert.equal(result.packet.readyToApply, true);
    assert.deepEqual(result.packet.missing, []);
    assert.equal(result.packet.readyCommand, `npm run appstore:apply-inputs -- --inputs-file ${inputPath} --mark-ready`);
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});

test("release input validator rejects placeholders before final signoff", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "charm-id-input-validator-"));

  try {
    const inputPath = writeInputs(tempRoot, {
      ...validInputs,
      "support-contact": "<support-contact>",
      "uploaded-build": "<uploaded-build>",
    });
    const result = runValidator(inputPath);

    assert.equal(result.ok, false);
    assert.equal(result.packet.readyToApply, false);
    assert.deepEqual(result.packet.placeholders, ["support-contact", "uploaded-build"]);
    assert.match(result.packet.next, /Replace missing/);
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});

test("release input validator rejects unknown or malformed values", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "charm-id-input-validator-"));

  try {
    const inputPath = writeInputs(tempRoot, {
      ...validInputs,
      "privacy-url": "http://example.com/privacy.html",
      "app-store-connect-app-id": "abc",
      unexpected: "value",
    });
    const result = runValidator(inputPath);

    assert.equal(result.ok, false);
    assert.deepEqual(result.packet.unknown, ["unexpected"]);
    assert.ok(
      result.packet.invalid.some((item: { key: string }) => item.key === "privacy-url"),
      "privacy-url should be invalid",
    );
    assert.ok(
      result.packet.invalid.some((item: { key: string }) => item.key === "app-store-connect-app-id"),
      "app-store-connect-app-id should be invalid",
    );
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});
