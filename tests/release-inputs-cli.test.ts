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
    "docs/support.html",
    "docs/privacy.html",
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
      "--copyright-holder",
      "WCF Inc.",
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
      "--copyright-holder",
      "WCF Inc.",
      "--privacy-url",
      "https://example.com/privacy.html",
      "--support-url",
      "https://example.com/support.html",
      "--release-commit",
      "abc1234",
      "--evidence-report-generated",
      "2026-06-25T00:00:00Z",
      "--app-store-connect-app-id",
      "1234567890",
      "--uploaded-build",
      "1.0 (1)",
      "--testflight-device",
      "iPhone 15 Pro / iOS 18",
      "--backup-validation-file",
      "charm-id-backup-2026-06-25.json",
      "--backup-validation-result",
      "passed",
      "--backup-import-result",
      "passed on physical iPhone",
      "--public-url-verification-result",
      "passed with npm run appstore:public-urls",
      "--strict-verification-result",
      "passed with npm run appstore:verify -- --strict",
      "--accessibility-label-result",
      "reviewed against physical iPhone test",
      "--age-rating-result",
      "4+ confirmed in App Store Connect",
      "--signoff-owner",
      "Release owner",
      "--signoff-date",
      "2026-06-25",
      "--mark-ready",
    ]);

    assert.equal(result.ok, true);
    assert.match(result.output, /Release inputs applied/);

    const supportPage = readFileSync(join(fixtureRoot, "public/support.html"), "utf8");
    const privacyPage = readFileSync(join(fixtureRoot, "public/privacy.html"), "utf8");
    const pagesSupportPage = readFileSync(join(fixtureRoot, "docs/support.html"), "utf8");
    const pagesPrivacyPage = readFileSync(join(fixtureRoot, "docs/privacy.html"), "utf8");
    const hostingDocs = readFileSync(join(fixtureRoot, "docs/github-pages-workflow.md"), "utf8");
    const finalSignoff = readFileSync(join(fixtureRoot, "docs/app-review-final-signoff.md"), "utf8");

    assert.match(supportPage, /mailto:support@example\.com/);
    assert.doesNotMatch(supportPage, /正式なサポート連絡先/);
    assert.match(privacyPage, /mailto:privacy@example\.com/);
    assert.doesNotMatch(privacyPage, /具体的な連絡先/);
    assert.match(pagesSupportPage, /mailto:support@example\.com/);
    assert.doesNotMatch(pagesSupportPage, /正式なサポート連絡先/);
    assert.match(pagesPrivacyPage, /mailto:privacy@example\.com/);
    assert.doesNotMatch(pagesPrivacyPage, /具体的な連絡先/);
    assert.match(hostingDocs, /https:\/\/example\.com\/privacy\.html/);
    assert.match(hostingDocs, /https:\/\/example\.com\/support\.html/);
    assert.match(finalSignoff, /- Support contact: support@example\.com/);
    assert.match(finalSignoff, /- Privacy contact: privacy@example\.com/);
    assert.match(finalSignoff, /- Copyright holder: WCF Inc\./);
    assert.match(finalSignoff, /- Final Privacy Policy URL: https:\/\/example\.com\/privacy\.html/);
    assert.match(finalSignoff, /- Final Support URL: https:\/\/example\.com\/support\.html/);
    assert.match(finalSignoff, /Status: Ready for App Review/);
    assert.match(finalSignoff, /- Release commit: abc1234/);
    assert.match(finalSignoff, /- Uploaded build: 1\.0 \(1\)/);
    assert.match(finalSignoff, /- Accessibility label result: reviewed against physical iPhone test/);
    assert.match(finalSignoff, /- Age rating result: 4\+ confirmed in App Store Connect/);
    assert.match(finalSignoff, /- Signoff owner: Release owner/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release input CLI applies values from a JSON inputs file", () => {
  const fixtureRoot = copyFixtureTree();

  try {
    const inputsPath = join(fixtureRoot, "release-inputs.json");
    writeFileSync(
      inputsPath,
      JSON.stringify(
        {
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
        },
        null,
        2,
      ),
    );

    const result = runApplyInputs(fixtureRoot, ["--inputs-file", inputsPath, "--mark-ready"]);

    assert.equal(result.ok, true);
    assert.match(result.output, /Release inputs applied/);

    const finalSignoff = readFileSync(join(fixtureRoot, "docs/app-review-final-signoff.md"), "utf8");
    const supportPage = readFileSync(join(fixtureRoot, "public/support.html"), "utf8");

    assert.match(finalSignoff, /Status: Ready for App Review/);
    assert.match(finalSignoff, /- App Store Connect app ID: 1234567890/);
    assert.match(finalSignoff, /- Uploaded build: 1\.0 \(1\)/);
    assert.match(finalSignoff, /- Copyright holder: WCF Inc\./);
    assert.match(supportPage, /mailto:support@example\.com/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release input CLI rejects unknown JSON input keys", () => {
  const fixtureRoot = copyFixtureTree();

  try {
    const inputsPath = join(fixtureRoot, "release-inputs.json");
    writeFileSync(inputsPath, JSON.stringify({ "support-contact": "support@example.com", unexpected: "value" }));

    const result = runApplyInputs(fixtureRoot, ["--inputs-file", inputsPath]);

    assert.equal(result.ok, false);
    assert.match(result.output, /Unknown option in --inputs-file: unexpected/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release input CLI refuses to mark final signoff ready when evidence is incomplete", () => {
  const fixtureRoot = copyFixtureTree();

  try {
    const result = runApplyInputs(fixtureRoot, [
      "--support-contact",
      "support@example.com",
      "--privacy-contact",
      "privacy@example.com",
      "--copyright-holder",
      "WCF Inc.",
      "--privacy-url",
      "https://example.com/privacy.html",
      "--support-url",
      "https://example.com/support.html",
      "--mark-ready",
    ]);

    assert.equal(result.ok, false);
    assert.match(result.output, /Cannot mark ready until final signoff fields are filled/);
    assert.match(result.output, /Release commit/);
    assert.match(result.output, /Age rating result/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
