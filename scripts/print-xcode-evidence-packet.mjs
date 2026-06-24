import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const projectPath = "ios/App/App.xcodeproj";
const pbxprojPath = `${projectPath}/project.pbxproj`;
const expectedBundleId = "com.wcf.charmid";

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim(),
    };
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function uniqueMatches(content, pattern) {
  return [...new Set([...content.matchAll(pattern)].map((match) => match[1]))];
}

function projectVersions() {
  if (!existsSync(join(root, pbxprojPath))) {
    return {
      marketingVersions: [],
      buildNumbers: [],
    };
  }

  const project = readFileSync(join(root, pbxprojPath), "utf8");

  return {
    marketingVersions: uniqueMatches(project, /MARKETING_VERSION = ([^;]+);/g),
    buildNumbers: uniqueMatches(project, /CURRENT_PROJECT_VERSION = ([^;]+);/g),
  };
}

const packageJson = readJson("package.json");
const xcodebuild = run("xcodebuild", ["-version"]);
const xcodeSelect = run("xcode-select", ["-p"]);
const selectedDeveloperPath = xcodeSelect.output;
const fullXcodeDeveloperPath = "/Applications/Xcode.app/Contents/Developer";
const fullXcodeSelected = xcodeSelect.ok && selectedDeveloperPath === fullXcodeDeveloperPath;
const xcodebuildReportsXcode = xcodebuild.ok && /^Xcode\s+\S+/m.test(xcodebuild.output);
const projectExists = existsSync(join(root, projectPath));
const pbxprojExists = existsSync(join(root, pbxprojPath));
const pbxproj = pbxprojExists ? readFileSync(join(root, pbxprojPath), "utf8") : "";
const bundleIdConfigured = pbxproj.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${expectedBundleId};`);
const versions = projectVersions();

const manualActions = [
  "Install full Xcode from the Mac App Store if /Applications/Xcode.app is missing.",
  `sudo xcode-select -s ${fullXcodeDeveloperPath}`,
  "xcodebuild -version",
  `open ${projectPath}`,
  "Select the Apple Developer Program team in the Xcode App target.",
  "Run a release build on a physical iPhone.",
  "Archive with Product > Archive, then Validate App and Distribute App from Organizer.",
  "Wait for App Store Connect build processing to finish.",
  "Run npm run appstore:verify -- --strict after all manual signoff fields are complete.",
];

const signoffFields = [
  {
    key: "app-store-connect-app-id",
    source: "App Store Connect app information page",
    example: "1234567890",
  },
  {
    key: "uploaded-build",
    source: "App Store Connect processed build",
    example: "1.0 (1)",
  },
  {
    key: "strict-verification-result",
    source: "npm run appstore:verify -- --strict",
    example: "passed",
  },
];

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Verify local Xcode and archive prerequisites before TestFlight or App Store upload.",
  sourceDoc: "docs/xcode-app-store-upload-guide.md",
  xcode: {
    selectedDeveloperPath,
    expectedDeveloperPath: fullXcodeDeveloperPath,
    fullXcodeSelected,
    xcodebuildReportsXcode,
    versionOutput: xcodebuild.output,
  },
  project: {
    path: projectPath,
    exists: projectExists,
    pbxprojPath,
    pbxprojExists,
  },
  bundleId: {
    expected: expectedBundleId,
    configured: bundleIdConfigured,
  },
  version: {
    packageVersion: packageJson.version,
    marketingVersions: versions.marketingVersions,
    buildNumbers: versions.buildNumbers,
  },
  readyForArchive: fullXcodeSelected && xcodebuildReportsXcode && projectExists && pbxprojExists && bundleIdConfigured,
  manualActions,
  signoffFields,
  relatedCommands: {
    sync: "npm run ios:sync",
    openProject: `open ${projectPath}`,
    strictGate: "npm run appstore:verify -- --strict",
    signoffCommand: "npm run appstore:signoff-command",
  },
};

console.log(JSON.stringify(packet, null, 2));
