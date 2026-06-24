import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

function runBackupValidation(path: string) {
  try {
    return {
      ok: true,
      output: execFileSync("npm", ["run", "backup:validate", "--", path], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

test("backup validation CLI accepts a valid exported dataset", () => {
  const result = runBackupValidation("tests/fixtures/valid-backup.json");

  assert.equal(result.ok, true);
  assert.match(result.output, /Backup validation passed/);
  assert.match(result.output, /Charms: 1/);
  assert.match(result.output, /Learned images: 1/);
});

test("backup validation CLI rejects duplicate normalized management numbers", () => {
  const result = runBackupValidation("tests/fixtures/invalid-duplicate-backup.json");

  assert.equal(result.ok, false);
  assert.match(result.output, /Invalid backup:/);
  assert.match(result.output, /CH-901/);
});
