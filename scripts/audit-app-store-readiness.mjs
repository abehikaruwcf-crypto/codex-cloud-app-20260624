import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const checks = [];

function addCheck(name, status, detail) {
  checks.push({ name, status, detail });
}

function fileExists(path, label = path) {
  const fullPath = join(root, path);
  const exists = existsSync(fullPath);
  addCheck(label, exists ? "pass" : "fail", exists ? path : `Missing: ${path}`);
  return exists;
}

function hasFile(path) {
  return existsSync(join(root, path));
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim(),
    };
  }
}

function requireText(path, needle, label) {
  if (!hasFile(path)) {
    addCheck(label, "fail", `Missing: ${path}`);
    return;
  }

  const content = read(path);
  addCheck(label, content.includes(needle) ? "pass" : "fail", `${path} contains ${needle}`);
}

function packageVersion() {
  if (!hasFile("package.json")) {
    return "";
  }

  return JSON.parse(read("package.json")).version;
}

function iosMarketingVersionFromPackage(version) {
  const parts = version.split(".");
  return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : version;
}

function uniqueMatches(content, pattern) {
  return [...new Set([...content.matchAll(pattern)].map((match) => match[1]))];
}

function requireProjectVersionSync() {
  if (!hasFile("ios/App/App.xcodeproj/project.pbxproj") || !hasFile("package.json")) {
    addCheck("Release version sync", "fail", "Missing project or package manifest");
    return;
  }

  const version = packageVersion();
  const expectedMarketingVersion = iosMarketingVersionFromPackage(version);
  const project = read("ios/App/App.xcodeproj/project.pbxproj");
  const marketingVersions = uniqueMatches(project, /MARKETING_VERSION = ([^;]+);/g);
  const buildNumbers = uniqueMatches(project, /CURRENT_PROJECT_VERSION = ([^;]+);/g);
  const marketingOk =
    marketingVersions.length === 1 && marketingVersions[0] === expectedMarketingVersion;
  const buildOk = buildNumbers.length === 1 && /^\d+$/.test(buildNumbers[0]);

  addCheck(
    "Release version sync",
    marketingOk && buildOk ? "pass" : "fail",
    `package=${version}, iOS marketing=${marketingVersions.join(",") || "missing"}, build=${buildNumbers.join(",") || "missing"}`,
  );
}

function pngInfo(path, expectedSize, label) {
  if (!hasFile(path)) {
    addCheck(label, "fail", `Missing: ${path}`);
    return;
  }

  const result = run("file", [join(root, path)]);
  const detail = result.output;
  const ok = result.ok && detail.includes(`PNG image data, ${expectedSize}`);
  addCheck(label, ok ? "pass" : "fail", detail);
}

function screenshotInfo(path, label) {
  if (!hasFile(path)) {
    addCheck(label, "fail", `Missing: ${path}`);
    return;
  }

  const result = run("file", [join(root, path)]);
  const size = statSync(join(root, path)).size;
  const ok = result.ok && result.output.includes("390x844") && size > 10_000;
  addCheck(label, ok ? "pass" : "warn", `${result.output}; ${size} bytes`);
}

function plistCheck(path, label) {
  if (!hasFile(path)) {
    addCheck(label, "fail", `Missing: ${path}`);
    return;
  }

  const result = run("plutil", ["-lint", join(root, path)]);
  addCheck(label, result.ok ? "pass" : "fail", result.output);
}

fileExists("package.json", "package manifest");
fileExists("capacitor.config.ts", "Capacitor config");
fileExists("ios/App/App.xcodeproj/project.pbxproj", "Xcode project");
fileExists("ios/App/App/Info.plist", "Info.plist");
fileExists("ios/App/App/PrivacyInfo.xcprivacy", "Privacy manifest");
fileExists("docs/app-store-metadata.md", "App Store metadata draft");
fileExists("docs/app-privacy-answers.md", "App privacy answers draft");
fileExists("docs/privacy-policy-draft.md", "Privacy policy draft");
fileExists("docs/app-store-screenshots.md", "Screenshot documentation");
fileExists("docs/app-store-submission-packet.md", "Submission packet");
fileExists("docs/testflight-release-checklist.md", "TestFlight release checklist");
fileExists("public/privacy.html", "Public privacy policy page");
fileExists("docs/github-pages-workflow.md", "GitHub Pages workflow template");
fileExists("scripts/smoke-app-ui.mjs", "UI smoke test");
fileExists("scripts/set-release-version.mjs", "Release version script");

plistCheck("ios/App/App/Info.plist", "Info.plist is valid");
plistCheck("ios/App/App/PrivacyInfo.xcprivacy", "Privacy manifest is valid");

requireText("ios/App/App/Info.plist", "NSCameraUsageDescription", "Camera usage description");
requireText("ios/App/App/Info.plist", "NSPhotoLibraryUsageDescription", "Photo library usage description");
requireText("ios/App/App/PrivacyInfo.xcprivacy", "NSPrivacyTracking", "Privacy tracking declaration");
requireText(
  "ios/App/App/PrivacyInfo.xcprivacy",
  "NSPrivacyAccessedAPICategoryUserDefaults",
  "UserDefaults required reason declaration",
);
requireText(
  "ios/App/App.xcodeproj/project.pbxproj",
  "PrivacyInfo.xcprivacy in Resources",
  "Privacy manifest included in resources",
);
requireText("capacitor.config.ts", 'appId: "com.wcf.charmid"', "Capacitor app ID");
requireText("ios/App/App.xcodeproj/project.pbxproj", "PRODUCT_BUNDLE_IDENTIFIER = com.wcf.charmid;", "Xcode Bundle ID");
requireProjectVersionSync();
requireText("ios/App/App/Info.plist", "Charm ID", "Display name");
requireText("package.json", "\"version\"", "Package release version");
requireText("public/privacy.html", "Charm ID Privacy Policy", "Privacy policy page title");
requireText("docs/github-pages-workflow.md", "actions/deploy-pages@v4", "Pages deployment action template");
requireText("package.json", "\"appstore:smoke\"", "UI smoke test script");
requireText("package.json", "\"appstore:set-version\"", "Release version script entry");

pngInfo(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  "1024 x 1024",
  "App icon 1024px PNG",
);
pngInfo(
  "ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png",
  "2732 x 2732",
  "Splash 2732px PNG",
);

for (const name of ["01-onboarding", "02-library", "03-identify", "04-register"]) {
  screenshotInfo(`outputs/app-store-screenshots/${name}.jpg`, `Screenshot ${name}`);
}

const build = run("npm", ["run", "build"]);
addCheck("Web production build", build.ok ? "pass" : "fail", build.output.split("\n").slice(-5).join("\n"));

const doctor = run("npx", ["cap", "doctor", "ios"]);
addCheck("Capacitor iOS doctor", doctor.ok ? "pass" : "fail", doctor.output);

const smoke = run("npm", ["run", "appstore:smoke"]);
addCheck("UI smoke test", smoke.ok ? "pass" : "fail", smoke.output.split("\n").slice(-8).join("\n"));

const xcode = run("xcodebuild", ["-version"]);
addCheck(
  "Xcode build tool",
  xcode.ok ? "pass" : "warn",
  xcode.ok ? xcode.output.trim() : "Xcode is not active; install/select full Xcode before TestFlight/App Store archive.",
);

const groups = { pass: 0, warn: 0, fail: 0 };
for (const check of checks) {
  groups[check.status] += 1;
}

for (const check of checks) {
  const marker = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
  console.log(`[${marker}] ${check.name}: ${check.detail}`);
}

console.log(`\nSummary: ${groups.pass} pass, ${groups.warn} warn, ${groups.fail} fail`);

if (groups.fail > 0) {
  process.exit(1);
}
