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
  const isExpectedSize = result.output.includes("390x844") || result.output.includes("1170x2532");
  const ok = result.ok && isExpectedSize && size > 10_000;
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
fileExists("docs/app-store-review-answers.md", "App Store review answers draft");
fileExists("docs/privacy-policy-draft.md", "Privacy policy draft");
fileExists("docs/release-notes.md", "Release notes");
fileExists("docs/app-store-screenshots.md", "Screenshot documentation");
fileExists("docs/app-store-submission-packet.md", "Submission packet");
fileExists("docs/testflight-release-checklist.md", "TestFlight release checklist");
fileExists("docs/app-review-final-signoff.md", "App Review final signoff");
fileExists("public/privacy.html", "Public privacy policy page");
fileExists("public/support.html", "Public support page");
fileExists("docs/github-actions-app-store-readiness.md", "App Store readiness CI workflow template");
fileExists("docs/github-pages-workflow.md", "GitHub Pages workflow template");
fileExists("scripts/smoke-app-ui.mjs", "UI smoke test");
fileExists("scripts/generate-app-store-screenshots.mjs", "Screenshot generation script");
fileExists("scripts/print-app-store-metadata.mjs", "App Store metadata print script");
fileExists("scripts/set-release-version.mjs", "Release version script");
fileExists("scripts/app-store-release-status.mjs", "Release status script");

plistCheck("ios/App/App/Info.plist", "Info.plist is valid");
plistCheck("ios/App/App/PrivacyInfo.xcprivacy", "Privacy manifest is valid");

requireText("ios/App/App/Info.plist", "NSCameraUsageDescription", "Camera usage description");
requireText("ios/App/App/Info.plist", "NSPhotoLibraryUsageDescription", "Photo library usage description");
requireText("ios/App/App/Info.plist", "<string>ja</string>", "iOS development region is Japanese");
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
requireText("public/support.html", "Charm ID Support", "Support page title");
requireText("public/support.html", `Version ${packageVersion()}`, "Support page release version");
requireText("public/support.html", "端末内データをリセット", "Support page explains local data reset");
requireText("public/support.html", "メールアドレス、電話番号", "Support page explains final contact requirement");
requireText("public/privacy.html", "端末内データをリセット", "Privacy page explains local data deletion");
requireText("public/privacy.html", "メールアドレス、電話番号", "Privacy page explains final contact requirement");
requireText("src/main.tsx", "APP_VERSION", "In-app release version display");
requireText("src/main.tsx", 'href="/support.html"', "In-app support link");
requireText("src/main.tsx", "追加学習しますか？", "Learning confirmation prompt");
requireText("src/main.tsx", "設定アプリで Charm ID > カメラ を許可", "Camera permission recovery guidance");
requireText("src/main.tsx", "写真ライブラリから選べる場合", "Photo library fallback guidance");
requireText("src/main.tsx", "を正解にする", "Candidate confirmation accessibility labels");
requireText("src/main.tsx", "は違う候補として記録", "Candidate rejection accessibility labels");
requireText("src/main.tsx", "候補にない場合の正しい管理番号", "Correction select accessibility label");
requireText("src/main.tsx", "登録品質", "Registration quality accessibility label");
requireText("docs/app-store-review-answers.md", "Sign-in required: No", "Review sign-in answer");
requireText("docs/app-store-review-answers.md", "Expected rating: 4+", "Age rating draft");
requireText("docs/app-store-review-answers.md", "custom cryptography", "Export compliance draft");
requireText("docs/app-store-review-answers.md", "camera access is denied", "Review notes cover camera permission denial");
requireText("docs/app-store-submission-packet.md", "app-store-review-answers.md", "Review answers linked from submission packet");
requireText("docs/app-store-metadata.md", "Japanese Metadata Draft", "Japanese App Store metadata draft");
requireText("docs/app-store-metadata.md", "小物を撮影して管理番号を確認", "Japanese subtitle draft");
requireText("docs/app-store-metadata.md", "管理番号,小物,チャーム,アクセサリー,部品,在庫,カメラ,識別", "Japanese keywords draft under byte limit");
requireText("docs/app-store-submission-packet.md", "Primary language: Japanese", "Submission packet primary language");
requireText("docs/app-store-submission-packet.md", "iOS development region: `ja`", "Submission packet iOS development region");
requireText("docs/app-store-submission-packet.md", "npm run appstore:metadata", "Submission packet includes metadata print command");
requireText("docs/app-store-submission-packet.md", "keywords 100 bytes", "Submission packet documents metadata limits");
requireText("docs/release-notes.md", "App Store What's New Draft", "Release notes include What's New");
requireText("docs/release-notes.md", "TestFlight Notes Draft", "Release notes include TestFlight notes");
requireText("docs/app-store-submission-packet.md", "release-notes.md", "Submission packet links release notes");
requireText("docs/github-actions-app-store-readiness.md", "npm run appstore:audit", "CI template runs App Store audit");
requireText("docs/github-actions-app-store-readiness.md", "macos-latest", "CI template runs on macOS");
requireText("docs/github-pages-workflow.md", "/support.html", "Support page Pages URL");
requireText("docs/github-pages-workflow.md", "actions/deploy-pages@v4", "Pages deployment action template");
requireText("docs/app-store-screenshots.md", "05-learning.jpg", "Screenshot docs include learning success shot");
requireText("package.json", "\"appstore:smoke\"", "UI smoke test script");
requireText("package.json", "\"appstore:screenshots\"", "Screenshot generation script entry");
requireText("package.json", "\"appstore:metadata\"", "Metadata print script entry");
requireText("package.json", "\"appstore:set-version\"", "Release version script entry");
requireText("package.json", "\"appstore:status\"", "Release status script entry");
requireText("scripts/print-app-store-metadata.mjs", "fieldLimits", "Metadata print includes field limits");
requireText("scripts/print-app-store-metadata.mjs", "maxBytes: 100", "Metadata print validates keyword byte limit");
requireText("scripts/print-app-store-metadata.mjs", "used > max", "Metadata print fails on field limit overflow");
requireText("scripts/set-release-version.mjs", "public/support.html", "Release version script updates support page");
requireText("scripts/app-store-release-status.mjs", "Formal support contact", "Release status checks support contact");
requireText("scripts/app-store-release-status.mjs", "formalSupportContactReady", "Release status requires concrete support contact");
requireText("scripts/app-store-release-status.mjs", "privacyContactReady", "Release status requires concrete privacy contact");
requireText("scripts/app-store-release-status.mjs", "hasConcreteContact", "Release status uses shared concrete contact detection");
requireText("scripts/app-store-release-status.mjs", "mailto:", "Release status accepts mailto support contact");
requireText("scripts/app-store-release-status.mjs", "tel:", "Release status accepts telephone support contact");
requireText("scripts/app-store-release-status.mjs", "Hosted privacy/support URLs", "Release status checks hosted URLs");
requireText("scripts/app-store-release-status.mjs", "Final App Review signoff", "Release status checks final signoff");
requireText("scripts/app-store-release-status.mjs", "^Status: Ready for App Review$", "Release status checks exact final signoff status");
requireText("scripts/app-store-release-status.mjs", "todoCount > 0", "Release status fails when TODO items remain");
requireText("scripts/app-store-release-status.mjs", "Status summary", "Release status prints summary");
requireText("scripts/app-store-release-status.mjs", "Next required inputs", "Release status prints next required inputs");
requireText("scripts/app-store-release-status.mjs", "public/privacy.html: replace the placeholder", "Release status points to privacy contact input");
requireText("scripts/app-store-release-status.mjs", "public/support.html: replace the placeholder", "Release status points to support contact input");
requireText("README.md", "npm run appstore:status", "README includes release status command");
requireText("README.md", "npm run appstore:metadata", "README includes metadata print command");
requireText("README.md", "exits non-zero", "README explains release status failure behavior");
requireText("README.md", "app-review-final-signoff.md", "README links final signoff");
requireText("README.md", "docs/release-notes.md", "README links release notes");
requireText("README.md", "public/support.html", "README references support page");
requireText("README.md", "final support contact", "README tracks support contact blocker");
requireText("docs/app-review-final-signoff.md", "Status: Pending", "Final signoff starts pending");
requireText("docs/app-review-final-signoff.md", "Status: Ready for App Review", "Final signoff ready marker");
requireText("docs/app-review-final-signoff.md", "concrete support contact", "Final signoff requires concrete support contact");
requireText("docs/app-review-final-signoff.md", "concrete privacy contact", "Final signoff requires concrete privacy contact");
requireText("docs/app-review-final-signoff.md", "npm run appstore:status", "Final signoff includes release status evidence");
requireText("docs/app-review-final-signoff.md", "TODO Resolution Inputs", "Final signoff includes TODO resolution inputs");
requireText("docs/app-review-final-signoff.md", "Formal support contact", "Final signoff maps support contact TODO");
requireText("docs/app-review-final-signoff.md", "Privacy policy contact", "Final signoff maps privacy contact TODO");
requireText("docs/privacy-policy-draft.md", "Concrete contact information", "Privacy policy draft requires concrete contact");
requireText("docs/app-store-review-answers.md", "concrete `mailto:` link", "Review answers require concrete support contact");
requireText("docs/testflight-release-checklist.md", "npm run appstore:status", "TestFlight checklist includes release status");
requireText("docs/testflight-release-checklist.md", "Status: Ready for App Review", "TestFlight checklist includes final signoff ready marker");
requireText("docs/testflight-release-checklist.md", "open ios/App/App.xcodeproj", "TestFlight checklist opens Xcode project");
requireText("docs/testflight-release-checklist.md", "Camera permission denial and retry path", "TestFlight checklist covers camera permission denial");
requireText("docs/app-store-submission-packet.md", "app-review-final-signoff.md", "Submission packet links final signoff");

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

const screenshots = run("npm", ["run", "appstore:screenshots"]);
addCheck(
  "Generated App Store screenshots",
  screenshots.ok ? "pass" : "fail",
  screenshots.output.split("\n").slice(-8).join("\n"),
);

for (const name of ["01-onboarding", "02-library", "03-identify", "04-register", "05-learning"]) {
  screenshotInfo(`outputs/app-store-screenshots/${name}.jpg`, `Screenshot ${name}`);
}

const metadata = run("npm", ["run", "appstore:metadata"]);
const metadataOk =
  metadata.ok &&
  metadata.output.includes('"bundleId": "com.wcf.charmid"') &&
  metadata.output.includes('"primaryLanguage": "Japanese"') &&
  metadata.output.includes('"subtitle": "小物を撮影して管理番号を確認"') &&
  metadata.output.includes('"maxBytes": 100');
addCheck("App Store metadata print", metadataOk ? "pass" : "fail", metadata.output.split("\n").slice(-12).join("\n"));

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
