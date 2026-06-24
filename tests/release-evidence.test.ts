import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();
let cachedEvidence: any;

function runEvidence() {
  if (cachedEvidence) {
    return cachedEvidence;
  }

  const output = execFileSync("npm", ["run", "appstore:evidence"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "release evidence output should include a JSON object");

  cachedEvidence = JSON.parse(output.slice(jsonStart));
  return cachedEvidence;
}

test("release evidence exposes final signoff readiness and missing fields", () => {
  const evidence = runEvidence();

  assert.equal(evidence.finalSignoff.path, "docs/app-review-final-signoff.md");
  assert.equal(evidence.finalSignoff.exists, true);
  assert.equal(evidence.finalSignoff.status, "Pending");
  assert.equal(evidence.finalSignoff.ready, false);
  assert.ok(evidence.finalSignoff.missingFields.includes("Release commit"));
  assert.ok(evidence.finalSignoff.missingFields.includes("Support contact"));
  assert.ok(evidence.finalSignoff.missingFields.includes("Copyright holder"));
  assert.ok(evidence.finalSignoff.filledFields.includes("Final Privacy Policy URL"));
  assert.ok(evidence.finalSignoff.filledFields.includes("Final Support URL"));
});

test("release evidence includes hosted page sources and the current manual gate", () => {
  const evidence = runEvidence();

  assert.equal(evidence.evidenceTargets.bundledPrivacyPage, "public/privacy.html");
  assert.equal(evidence.evidenceTargets.bundledSupportPage, "public/support.html");
  assert.equal(evidence.evidenceTargets.hostedPrivacyPageSource, "docs/privacy.html");
  assert.equal(evidence.evidenceTargets.hostedSupportPageSource, "docs/support.html");
  assert.equal(evidence.evidenceTargets.privacyDoc, "docs/app-privacy-answers.md");
  assert.equal(evidence.evidenceTargets.privacyManifest, "ios/App/App/PrivacyInfo.xcprivacy");
  assert.equal(evidence.evidenceTargets.privacyPacket, "npm run appstore:privacy");
  assert.equal(evidence.evidenceTargets.screenshotDoc, "docs/app-store-screenshots.md");
  assert.equal(evidence.evidenceTargets.screenshotPacket, "npm run appstore:screenshot-packet");
  assert.equal(evidence.evidenceTargets.xcodePacket, "npm run appstore:xcode-packet");
  assert.ok([4, 5].includes(evidence.releaseStatus.todo), "manual TODO count should tolerate Xcode availability");
  assert.equal(evidence.publishing.publicUrlsReachable, true);
  assert.equal(evidence.nextStrictGate, "npm run appstore:verify -- --strict");
});

test("release evidence includes App Privacy packet", () => {
  const evidence = runEvidence();

  assert.equal(evidence.privacy.command, "npm run appstore:privacy");
  assert.equal(evidence.privacy.packetGenerated, true);
  assert.equal(evidence.privacy.sourceDoc, "docs/app-privacy-answers.md");
  assert.equal(evidence.privacy.privacyManifest, "ios/App/App/PrivacyInfo.xcprivacy");
  assert.equal(evidence.privacy.appStoreConnectAnswers.dataCollected, "No");
  assert.equal(evidence.privacy.appStoreConnectAnswers.tracking, "No");
  assert.equal(evidence.privacy.manifestChecks.trackingDeclaredFalse, true);
  assert.equal(evidence.privacy.manifestChecks.collectedDataTypesEmpty, true);
});

test("release evidence includes screenshot readiness packet", () => {
  const evidence = runEvidence();

  assert.equal(evidence.screenshots.command, "npm run appstore:screenshot-packet");
  assert.equal(evidence.screenshots.packetGenerated, true);
  assert.equal(evidence.screenshots.sourceDoc, "docs/app-store-screenshots.md");
  assert.deepEqual(
    evidence.screenshots.profiles.map((profile: { key: string }) => profile.key),
    ["iphone-6-9", "iphone-6-5"],
  );
  for (const profile of evidence.screenshots.profiles) {
    assert.equal(profile.files.length, 5);
  }
});

test("release evidence includes Xcode archive readiness packet", () => {
  const evidence = runEvidence();

  assert.equal(evidence.xcode.command, "npm run appstore:xcode-packet");
  assert.equal(evidence.xcode.packetGenerated, true);
  assert.equal(evidence.xcode.expectedDeveloperPath, "/Applications/Xcode.app/Contents/Developer");
  assert.equal(evidence.xcode.projectPath, "ios/App/App.xcodeproj");
  assert.equal(evidence.xcode.bundleIdConfigured, true);
  assert.equal(typeof evidence.xcode.readyForArchive, "boolean");
  assert.deepEqual(
    evidence.xcode.signoffFields.map((field: { key: string }) => field.key),
    ["app-store-connect-app-id", "uploaded-build", "strict-verification-result"],
  );
});

test("release evidence check allows manual TODOs by default and blocks strict mode", () => {
  const defaultOutput = execFileSync("npm", ["run", "appstore:evidence-check"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.match(defaultOutput, /\[PASS\] Public App Store URLs/);
  assert.match(defaultOutput, /\[PASS\] App Privacy evidence packet/);
  assert.match(defaultOutput, /\[PASS\] Screenshot evidence packet/);
  assert.match(defaultOutput, /\[PASS\] Xcode evidence packet/);
  assert.match(defaultOutput, /\[TODO\] Final signoff readiness/);

  assert.throws(
    () =>
      execFileSync("npm", ["run", "appstore:evidence-check", "--", "--strict"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    /Command failed/,
  );
});
