import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const scriptPath = join(repoRoot, "scripts", "set-release-version.mjs");

function copyVersionFixture() {
  const tempRoot = mkdtempSync(join(tmpdir(), "charm-id-release-version-"));
  const paths = [
    "package.json",
    "package-lock.json",
    "ios/App/App.xcodeproj/project.pbxproj",
    "public/support.html",
    "docs/support.html",
  ];

  for (const path of paths) {
    const destination = join(tempRoot, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(join(repoRoot, path), "utf8"));
  }

  return tempRoot;
}

function runSetVersion(cwd: string, args: string[]) {
  return execFileSync("node", [scriptPath, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

test("release version CLI keeps bundled and hosted support pages in sync", () => {
  const fixtureRoot = copyVersionFixture();

  try {
    const output = runSetVersion(fixtureRoot, ["1.2.3", "42"]);
    const packageJson = JSON.parse(readFileSync(join(fixtureRoot, "package.json"), "utf8"));
    const packageLock = JSON.parse(readFileSync(join(fixtureRoot, "package-lock.json"), "utf8"));
    const project = readFileSync(join(fixtureRoot, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    const bundledSupportPage = readFileSync(join(fixtureRoot, "public/support.html"), "utf8");
    const hostedSupportPage = readFileSync(join(fixtureRoot, "docs/support.html"), "utf8");

    assert.match(output, /Release version set: package 1\.2\.3, iOS 1\.2\.3 \(42\)/);
    assert.equal(packageJson.version, "1.2.3");
    assert.equal(packageLock.version, "1.2.3");
    assert.match(project, /MARKETING_VERSION = 1\.2\.3;/);
    assert.match(project, /CURRENT_PROJECT_VERSION = 42;/);
    assert.match(bundledSupportPage, /Version 1\.2\.3/);
    assert.match(hostedSupportPage, /Version 1\.2\.3/);
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
});
