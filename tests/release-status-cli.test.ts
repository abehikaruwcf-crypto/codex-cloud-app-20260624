import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, "scripts", "app-store-release-status.mjs");

function copyStatusFixture() {
  const tempRoot = mkdtempSync(join(tmpdir(), "charm-id-release-status-"));
  const files = [
    "package.json",
    "public/support.html",
    "public/privacy.html",
    "docs/github-pages-workflow.md",
    "docs/app-store-submission-packet.md",
    "docs/app-store-review-answers.md",
    "docs/testflight-release-checklist.md",
    "docs/app-review-final-signoff.md",
  ];

  for (const path of files) {
    const destination = join(tempRoot, path);
    mkdirSync(join(destination, ".."), { recursive: true });
    writeFileSync(destination, readFileSync(join(repoRoot, path), "utf8"));
  }

  mkdirSync(join(tempRoot, "ios/App/App.xcodeproj"), { recursive: true });

  return tempRoot;
}

function runReleaseStatus(cwd: string) {
  try {
    return {
      ok: true,
      output: execFileSync("node", [scriptPath], {
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

function readSignoff(cwd: string) {
  return readFileSync(join(cwd, "docs/app-review-final-signoff.md"), "utf8");
}

function writeSignoff(cwd: string, content: string) {
  writeFileSync(join(cwd, "docs/app-review-final-signoff.md"), content);
}

function fillSignoffFields(content: string) {
  const replacements: Record<string, string> = {
    "Release commit": "abc1234",
    "Evidence report generated": "2026-06-25T00:00:00Z",
    "App Store Connect app ID": "1234567890",
    "Uploaded build": "1.0 (1)",
    "TestFlight device": "iPhone 15 Pro / iOS 18",
    "Backup validation file": "charm-id-backup-2026-06-25.json",
    "Backup validation result": "passed",
    "Backup import result": "passed on physical iPhone",
    "Strict verification result": "passed",
    "Final Privacy Policy URL": "https://example.com/privacy.html",
    "Final Support URL": "https://example.com/support.html",
    "Support contact": "support@example.com",
    "Privacy contact": "privacy@example.com",
    "Signoff owner": "Release owner",
    "Signoff date": "2026-06-25",
  };

  let updated = content.replace("Status: Pending", "Status: Ready for App Review");

  for (const [label, value] of Object.entries(replacements)) {
    updated = updated.replace(new RegExp(`^- ${label}:.*$`, "m"), `- ${label}: ${value}`);
  }

  return updated;
}

test("release status keeps final signoff TODO when status is ready but evidence fields are blank", () => {
  const fixtureRoot = copyStatusFixture();

  try {
    writeSignoff(fixtureRoot, readSignoff(fixtureRoot).replace("Status: Pending", "Status: Ready for App Review"));
    const result = runReleaseStatus(fixtureRoot);

    assert.equal(result.ok, false);
    assert.match(result.output, /\[TODO\] Final App Review signoff: Fill final signoff evidence fields:/);
    assert.match(result.output, /Release commit/);
    assert.match(result.output, /Signoff date/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});

test("release status passes final signoff check when status and required evidence fields are filled", () => {
  const fixtureRoot = copyStatusFixture();

  try {
    writeSignoff(fixtureRoot, fillSignoffFields(readSignoff(fixtureRoot)));
    const result = runReleaseStatus(fixtureRoot);

    assert.equal(result.ok, false);
    assert.match(
      result.output,
      /\[PASS\] Final App Review signoff: docs\/app-review-final-signoff\.md is marked ready and required evidence fields are filled\./,
    );
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
