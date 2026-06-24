import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, "scripts", "apply-release-inputs.mjs");

function copyFixtureTree() {
  const tempRoot = mkdtempSync(join(tmpdir(), "charm-id-release-inputs-"));
  const paths = [
    "public/support.html",
    "public/privacy.html",
    "docs/github-pages-workflow.md",
    "docs/app-review-final-signoff.md",
  ];

  for (const path of paths) {
    const destination = join(tempRoot, path);
    mkdirSync(join(destination, ".."), { recursive: true });
    writeFileSync(destination, readFileSync(join(repoRoot, path), "utf8"));
  }

  return tempRoot;
}

function runApplyInputs(cwd: string, args: string[]) {
  try {
    return {
      ok: true,
      output: execFileSync("node", [scriptPath, ...args], {
        cwd,
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

test("release input CLI validates dry-run inputs without writing files", () => {
  const fixtureRoot = copyFixtureTree();

  try {
    const originalSupportPage = readFileSync(join(fixtureRoot, "public/support.html"), "utf8");
    const result = runApplyInputs(fixtureRoot, [
      "--support-contact",
      "support@example.com",
      "--privacy-contact",
      "privacy@example.com",
      "--privacy-url",
      "https://example.com/privacy.html",
      "--support-url",
      "https://example.com/support.html",
      "--dry-run",
    ]);

    assert.equal(result.ok, true);
    assert.match(result.output, /Release inputs validated/);
    assert.equal(readFileSync(join(fixtureRoot, "public/support.html"), "utf8"), originalSupportPage);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release input CLI rejects non-https public URLs", () => {
  const fixtureRoot = copyFixtureTree();

  try {
    const result = runApplyInputs(fixtureRoot, [
      "--privacy-url",
      "http://example.com/privacy.html",
      "--support-url",
      "https://example.com/support.html",
    ]);

    assert.equal(result.ok, false);
    assert.match(result.output, /--privacy-url must be a valid https URL/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release input CLI applies contacts, hosted URLs, and signoff evidence fields", () => {
  const fixtureRoot = copyFixtureTree();

  try {
    const result = runApplyInputs(fixtureRoot, [
      "--support-contact",
      "support@example.com",
      "--privacy-contact",
      "privacy@example.com",
      "--privacy-url",
      "https://example.com/privacy.html",
      "--support-url",
      "https://example.com/support.html",
    ]);

    assert.equal(result.ok, true);
    assert.match(result.output, /Release inputs applied/);

    const supportPage = readFileSync(join(fixtureRoot, "public/support.html"), "utf8");
    const privacyPage = readFileSync(join(fixtureRoot, "public/privacy.html"), "utf8");
    const hostingDocs = readFileSync(join(fixtureRoot, "docs/github-pages-workflow.md"), "utf8");
    const finalSignoff = readFileSync(join(fixtureRoot, "docs/app-review-final-signoff.md"), "utf8");

    assert.match(supportPage, /mailto:support@example\.com/);
    assert.doesNotMatch(supportPage, /正式なサポート連絡先/);
    assert.match(privacyPage, /mailto:privacy@example\.com/);
    assert.doesNotMatch(privacyPage, /具体的な連絡先/);
    assert.match(hostingDocs, /https:\/\/example\.com\/privacy\.html/);
    assert.match(hostingDocs, /https:\/\/example\.com\/support\.html/);
    assert.match(finalSignoff, /- Support contact: support@example\.com/);
    assert.match(finalSignoff, /- Privacy contact: privacy@example\.com/);
    assert.match(finalSignoff, /- Final Privacy Policy URL: https:\/\/example\.com\/privacy\.html/);
    assert.match(finalSignoff, /- Final Support URL: https:\/\/example\.com\/support\.html/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
