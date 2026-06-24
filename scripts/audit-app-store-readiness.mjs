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
  const isExpectedSize = result.output.includes("1170x2532");
  const ok = result.ok && isExpectedSize && size > 10_000;
  addCheck(label, ok ? "pass" : "fail", `${result.output}; ${size} bytes`);
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
fileExists("docs/app-age-rating-answers.md", "App age rating answers draft");
fileExists("docs/app-privacy-answers.md", "App privacy answers draft");
fileExists("docs/app-accessibility-answers.md", "App accessibility answers draft");
fileExists("docs/app-store-review-answers.md", "App Store review answers draft");
fileExists("docs/privacy-policy-draft.md", "Privacy policy draft");
fileExists("docs/release-notes.md", "Release notes");
fileExists("docs/app-store-screenshots.md", "Screenshot documentation");
fileExists("docs/app-store-submission-packet.md", "Submission packet");
fileExists("docs/testflight-release-checklist.md", "TestFlight release checklist");
fileExists("docs/app-review-final-signoff.md", "App Review final signoff");
fileExists("docs/xcode-app-store-upload-guide.md", "Xcode App Store upload guide");
fileExists("public/privacy.html", "Public privacy policy page");
fileExists("public/support.html", "Public support page");
fileExists("docs/privacy.html", "Pages privacy policy page");
fileExists("docs/support.html", "Pages support page");
fileExists("docs/.nojekyll", "Pages Jekyll bypass marker");
fileExists("docs/github-actions-app-store-readiness.md", "App Store readiness CI workflow template");
fileExists("docs/github-pages-workflow.md", "GitHub Pages workflow template");
fileExists("scripts/smoke-app-ui.mjs", "UI smoke test");
fileExists("scripts/run-unit-tests.mjs", "Unit test runner");
fileExists("scripts/validate-backup.mjs", "Backup validation CLI");
fileExists("scripts/generate-app-store-screenshots.mjs", "Screenshot generation script");
fileExists("scripts/print-screenshot-evidence-packet.mjs", "Screenshot evidence packet script");
fileExists("scripts/print-xcode-evidence-packet.mjs", "Xcode evidence packet script");
fileExists("scripts/print-app-store-metadata.mjs", "App Store metadata print script");
fileExists("scripts/print-app-store-connect-packet.mjs", "App Store Connect packet script");
fileExists("scripts/print-app-store-submission-checklist.mjs", "App Store submission checklist script");
fileExists("scripts/print-app-privacy-answers.mjs", "App Privacy answers print script");
fileExists("scripts/print-app-age-rating-answers.mjs", "App age rating answers print script");
fileExists("scripts/print-app-accessibility-answers.mjs", "App accessibility answers print script");
fileExists("scripts/print-testflight-evidence-packet.mjs", "TestFlight evidence packet script");
fileExists("scripts/print-release-handoff-packet.mjs", "Release handoff packet script");
fileExists("scripts/print-app-review-signoff-draft.mjs", "App Review signoff draft script");
fileExists("scripts/print-release-signoff-command.mjs", "Release signoff command script");
fileExists("scripts/print-release-input-template.mjs", "Release input template script");
fileExists("scripts/print-app-store-preflight.mjs", "App Store preflight print script");
fileExists("scripts/apply-release-inputs.mjs", "Release input application script");
fileExists("scripts/verify-public-urls.mjs", "Public URL verification script");
fileExists("scripts/verify-app-store-release.mjs", "App Store verification script");
fileExists("scripts/generate-release-evidence.mjs", "Release evidence script");
fileExists("scripts/check-release-evidence.mjs", "Release evidence check script");
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
requireText("vite.config.ts", 'base: "./"', "Vite build uses relative asset base");
requireText("index.html", 'href="manifest.webmanifest"', "Web manifest link is project-page safe");
requireText("public/support.html", 'href="privacy.html"', "Support page privacy link is project-page safe");
requireText("src/main.tsx", "APP_VERSION", "In-app release version display");
requireText("src/main.tsx", 'href="support.html"', "In-app support link is project-page safe");
requireText("src/main.tsx", "追加学習しますか？", "Learning confirmation prompt");
requireText("src/main.tsx", "設定アプリで Charm ID > カメラ を許可", "Camera permission recovery guidance");
requireText("src/main.tsx", "写真ライブラリから選べる場合", "Photo library fallback guidance");
requireText("src/main.tsx", "STORED_IMAGE_MAX_EDGE", "Stored image max-edge resize guard");
requireText("src/main.tsx", "toDataURL(\"image/jpeg\", STORED_IMAGE_QUALITY)", "Stored image JPEG compression");
requireText("src/main.tsx", "撮影写真は端末内保存前にサイズ調整", "In-app storage-size explanation");
requireText("scripts/smoke-app-ui.mjs", "Uploaded register images should be resized and JPEG-compressed before storage", "Stored image compression smoke test");
requireText("src/main.tsx", "を正解にする", "Candidate confirmation accessibility labels");
requireText("src/main.tsx", "は違う候補として記録", "Candidate rejection accessibility labels");
requireText("src/main.tsx", "候補にない場合の正しい管理番号", "Correction select accessibility label");
requireText("src/main.tsx", "登録品質", "Registration quality accessibility label");
requireText("docs/app-store-review-answers.md", "Sign-in required: No", "Review sign-in answer");
requireText("docs/app-store-review-answers.md", "Expected rating: 4+", "Age rating draft");
requireText("docs/app-store-review-answers.md", "npm run appstore:rating", "Review answers include age rating command");
requireText("docs/app-store-review-answers.md", "custom cryptography", "Export compliance draft");
requireText("docs/app-store-review-answers.md", "camera access is denied", "Review notes cover camera permission denial");
requireText("docs/app-store-review-answers.md", "github.io/codex-cloud-app-20260624/support.html", "Review answers include final support URL");
requireText("docs/app-store-review-answers.md", "npm run appstore:public-urls", "Review answers include public URL verification");
requireText("docs/app-store-submission-packet.md", "app-store-review-answers.md", "Review answers linked from submission packet");
requireText("docs/app-store-metadata.md", "Japanese Metadata Draft", "Japanese App Store metadata draft");
requireText("docs/app-store-metadata.md", "小物を撮影して管理番号を確認", "Japanese subtitle draft");
requireText("docs/app-store-metadata.md", "管理番号,小物,チャーム,アクセサリー,部品,在庫,カメラ,識別", "Japanese keywords draft under byte limit");
requireText("docs/app-store-submission-packet.md", "Primary language: Japanese", "Submission packet primary language");
requireText("docs/app-store-submission-packet.md", "iOS development region: `ja`", "Submission packet iOS development region");
requireText("docs/app-store-submission-packet.md", "npm run appstore:metadata", "Submission packet includes metadata print command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:connect-packet", "Submission packet includes App Store Connect packet command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:submission-checklist", "Submission packet includes screen-by-screen checklist command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:privacy", "Submission packet includes App Privacy command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:preflight", "Submission packet includes App Store preflight command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:rating", "Submission packet includes age rating command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:accessibility", "Submission packet includes accessibility command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:signoff-draft", "Submission packet includes signoff draft command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:public-urls", "Submission packet includes public URL verification command");
requireText("docs/app-store-submission-packet.md", "xcode-app-store-upload-guide.md", "Submission packet links Xcode upload guide");
requireText("docs/app-store-submission-packet.md", "keywords 100 bytes", "Submission packet documents metadata limits");
requireText("docs/app-store-submission-packet.md", "App Store Connect Entry Checklist", "Submission packet includes App Store Connect entry map");
requireText("docs/app-store-submission-packet.md", "Formal support and privacy contacts", "Submission packet tracks remaining contact blocker");
requireText("docs/release-notes.md", "App Store What's New Draft", "Release notes include What's New");
requireText("docs/release-notes.md", "TestFlight Notes Draft", "Release notes include TestFlight notes");
requireText("docs/app-store-submission-packet.md", "release-notes.md", "Submission packet links release notes");
requireText("docs/github-actions-app-store-readiness.md", "npm run appstore:audit", "CI template runs App Store audit");
requireText("docs/github-actions-app-store-readiness.md", "macos-latest", "CI template runs on macOS");
requireText("docs/github-actions-app-store-readiness.md", "npm run appstore:verify", "CI template runs verification gate");
requireText("docs/github-actions-app-store-readiness.md", "-- --strict", "CI template documents strict verification");
requireText("docs/github-pages-workflow.md", "gh-pages @", "Pages notes record published branch");
requireText("docs/github-pages-workflow.md", "Source: pages-docs /docs", "Pages notes record active Pages source");
requireText("docs/github-pages-workflow.md", "GitHub Pages build status: built", "Pages notes record successful build");
requireText("docs/github-pages-workflow.md", "github.io/codex-cloud-app-20260624/privacy.html", "Pages notes include final privacy URL");
requireText("docs/github-pages-workflow.md", "/support.html", "Support page Pages URL");
requireText("docs/github-pages-workflow.md", "actions/deploy-pages@v4", "Pages deployment action template");
requireText("README.md", "docs/privacy.html", "README references Pages privacy source");
requireText("README.md", "docs/support.html", "README references Pages support source");
requireText("docs/app-store-screenshots.md", "05-learning.jpg", "Screenshot docs include learning success shot");
requireText("scripts/generate-app-store-screenshots.mjs", "clip: { x: 0, y: 0, width: profile.viewport.width, height: profile.viewport.height }", "Screenshot generation uses exact viewport clip");
requireText("scripts/generate-app-store-screenshots.mjs", "failed screenshot validation", "Screenshot generation validates output dimensions");
requireText("package.json", "\"test:unit\"", "Unit test script entry");
requireText("package.json", "\"backup:validate\"", "Backup validation script entry");
requireText("package.json", "\"appstore:smoke\"", "UI smoke test script");
requireText("package.json", "\"appstore:screenshots\"", "Screenshot generation script entry");
requireText("package.json", "\"appstore:screenshots:submission\"", "Submission screenshot script entry");
requireText("package.json", "\"appstore:screenshot-packet\"", "Screenshot evidence packet script entry");
requireText("package.json", "\"appstore:xcode-packet\"", "Xcode evidence packet script entry");
requireText("scripts/generate-app-store-screenshots.mjs", "iphone-6-9", "Screenshot generation includes 6.9 inch profile");
requireText("scripts/generate-app-store-screenshots.mjs", "1320, height: 2868", "Screenshot generation validates 6.9 inch output");
requireText("scripts/generate-app-store-screenshots.mjs", "iphone-6-5", "Screenshot generation includes 6.5 inch profile");
requireText("scripts/generate-app-store-screenshots.mjs", "1242, height: 2688", "Screenshot generation validates 6.5 inch output");
requireText("docs/app-store-screenshots.md", "npm run appstore:screenshots:submission", "Screenshot docs include submission-size command");
requireText("docs/app-store-screenshots.md", "npm run appstore:screenshot-packet", "Screenshot docs include evidence packet command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:screenshots:submission", "Submission packet includes submission screenshot command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:screenshot-packet", "Submission packet includes screenshot evidence command");
requireText("docs/app-store-submission-packet.md", "npm run appstore:xcode-packet", "Submission packet includes Xcode evidence command");
requireText("package.json", "\"appstore:metadata\"", "Metadata print script entry");
requireText("package.json", "\"appstore:connect-packet\"", "App Store Connect packet script entry");
requireText("package.json", "\"appstore:submission-checklist\"", "App Store submission checklist script entry");
requireText("package.json", "\"appstore:privacy\"", "App Privacy script entry");
requireText("package.json", "\"appstore:rating\"", "App age rating script entry");
requireText("package.json", "\"appstore:accessibility\"", "App accessibility script entry");
requireText("package.json", "\"appstore:testflight-packet\"", "TestFlight evidence packet script entry");
requireText("package.json", "\"appstore:handoff\"", "Release handoff packet script entry");
requireText("package.json", "\"appstore:signoff-draft\"", "App Review signoff draft script entry");
requireText("package.json", "\"appstore:signoff-command\"", "Release signoff command script entry");
requireText("package.json", "\"appstore:signoff-template\"", "Release input template script entry");
requireText("package.json", "\"appstore:preflight\"", "App Store preflight script entry");
requireText("package.json", "\"appstore:apply-inputs\"", "Release input application script entry");
requireText("package.json", "\"appstore:public-urls\"", "Public URL verification script entry");
requireText("package.json", "\"appstore:set-version\"", "Release version script entry");
requireText("package.json", "\"appstore:verify\"", "App Store verification script entry");
requireText("package.json", "\"appstore:evidence\"", "Release evidence script entry");
requireText("package.json", "\"appstore:evidence-check\"", "Release evidence check script entry");
requireText("package.json", "\"appstore:status\"", "Release status script entry");
requireText("scripts/apply-release-inputs.mjs", "--support-contact", "Release input script accepts support contact");
requireText("scripts/apply-release-inputs.mjs", "--inputs-file", "Release input script accepts JSON inputs file");
requireText("scripts/apply-release-inputs.mjs", "--privacy-contact", "Release input script accepts privacy contact");
requireText("scripts/apply-release-inputs.mjs", "--copyright-holder", "Release input script accepts copyright holder");
requireText("scripts/apply-release-inputs.mjs", "--privacy-url", "Release input script accepts privacy URL");
requireText("scripts/apply-release-inputs.mjs", "--support-url", "Release input script accepts support URL");
requireText("scripts/apply-release-inputs.mjs", "--release-commit", "Release input script accepts final signoff evidence");
requireText("scripts/apply-release-inputs.mjs", "--accessibility-label-result", "Release input script accepts accessibility signoff result");
requireText("scripts/apply-release-inputs.mjs", "--age-rating-result", "Release input script accepts age rating signoff result");
requireText("scripts/apply-release-inputs.mjs", "--mark-ready", "Release input script can mark final signoff ready");
requireText("scripts/apply-release-inputs.mjs", "--dry-run", "Release input script supports dry run");
requireText("scripts/apply-release-inputs.mjs", "https URL", "Release input script requires HTTPS URLs");
requireText("scripts/apply-release-inputs.mjs", "requireFinalSignoffEvidence", "Release input script validates final signoff evidence formats");
requireText("scripts/apply-release-inputs.mjs", "docs/support.html", "Release input script updates Pages support page");
requireText("scripts/apply-release-inputs.mjs", "docs/privacy.html", "Release input script updates Pages privacy page");
requireText("tests/release-inputs-cli.test.ts", "release input CLI validates dry-run inputs", "Release input CLI dry-run unit test exists");
requireText("tests/release-inputs-cli.test.ts", "rejects non-https public URLs", "Release input CLI URL validation test exists");
requireText("tests/release-inputs-cli.test.ts", "applies contacts, hosted URLs, and signoff evidence fields", "Release input CLI apply test exists");
requireText("tests/release-inputs-cli.test.ts", "applies values from a JSON inputs file", "Release input CLI JSON file test exists");
requireText("tests/release-inputs-cli.test.ts", "Copyright holder: WCF Inc", "Release input CLI verifies copyright holder update");
requireText("tests/release-inputs-cli.test.ts", "rejects malformed final signoff evidence values", "Release input CLI malformed evidence test exists");
requireText("tests/release-inputs-cli.test.ts", "refuses to mark final signoff ready", "Release input CLI ready guard test exists");
requireText("tests/release-inputs-cli.test.ts", "pagesSupportPage", "Release input CLI verifies Pages support contact update");
requireText("tests/release-inputs-cli.test.ts", "pagesPrivacyPage", "Release input CLI verifies Pages privacy contact update");
requireText("tests/release-version-cli.test.ts", "keeps bundled and hosted support pages in sync", "Release version CLI Pages sync unit test exists");
requireText("tests/release-evidence.test.ts", "exposes final signoff readiness", "Release evidence final signoff unit test exists");
requireText("tests/release-evidence.test.ts", "includes hosted page sources", "Release evidence hosted source unit test exists");
requireText("tests/release-evidence.test.ts", "blocks strict mode", "Release evidence strict check unit test exists");
requireText("tests/release-status-cli.test.ts", "status is ready but evidence fields are blank", "Release status final signoff guard test exists");
requireText("tests/release-status-cli.test.ts", "status and required evidence fields are filled", "Release status filled signoff test exists");
requireText("tests/release-status-cli.test.ts", "exits nonzero while App Review TODOs remain", "Release status TODO-blocking test exists");
requireText("tests/app-privacy-answers.test.ts", "App Privacy packet maps local-only release answers", "App Privacy packet unit test exists");
requireText("tests/app-store-preflight.test.ts", "App Store preflight stays parseable", "App Store preflight JSON unit test exists");
requireText("tests/app-store-preflight.test.ts", "confirms every submission packet substep", "App Store preflight substep unit test exists");
requireText("tests/app-store-submission-checklist.test.ts", "maps Connect packet into screen order", "App Store submission checklist unit test exists");
requireText("tests/screenshot-evidence-packet.test.ts", "maps App Store image sets", "Screenshot evidence packet unit test exists");
requireText("tests/xcode-evidence-packet.test.ts", "maps archive prerequisites to signoff fields", "Xcode evidence packet unit test exists");
requireText("tests/testflight-evidence-packet.test.ts", "maps physical QA to signoff fields", "TestFlight evidence packet unit test exists");
requireText("tests/release-handoff-packet.test.ts", "maps remaining release work to owners and inputs", "Release handoff packet unit test exists");
requireText("tests/release-signoff-command.test.ts", "release signoff command packet keeps placeholders explicit", "Release signoff command unit test exists");
requireText("tests/release-input-template.test.ts", "maps final signoff values to apply-inputs JSON", "Release input template unit test exists");
requireText("tests/matching-and-learning.test.ts", "matching ranks the closest charm", "Matching ranking unit test exists");
requireText("tests/matching-and-learning.test.ts", "learning merge keeps the latest examples", "Learning cap unit test exists");
requireText("tests/matching-and-learning.test.ts", "backup validation rejects duplicate management numbers", "Backup duplicate validation unit test exists");
requireText("tests/matching-and-learning.test.ts", "backup validation rejects incomplete six-angle models", "Backup angle validation unit test exists");
requireText("src/backup.ts", "validateBackupPayload", "Backup validation module exists");
requireText("src/backup.ts", "createBackupPayload", "Backup export payload helper exists");
requireText("src/main.tsx", "バックアップを書き出せませんでした", "Backup export validates before download");
requireText("tests/matching-and-learning.test.ts", "backup export payload validates", "Backup export validation unit test exists");
requireText("scripts/validate-backup.mjs", "Backup validation passed", "Backup validation CLI reports success");
requireText("src/main.tsx", "現在の端末内データを置き換えます", "Backup restore replacement confirmation");
requireText("scripts/smoke-app-ui.mjs", "Dismissed restore confirmation should keep existing models", "Backup restore cancellation smoke test");
requireText("scripts/verify-app-store-release.mjs", "appstore:status", "Verification script includes release status");
requireText("scripts/verify-app-store-release.mjs", "appstore:public-urls", "Verification script includes public URL check");
requireText("scripts/verify-app-store-release.mjs", "appstore:evidence", "Verification script includes release evidence");
requireText("scripts/verify-app-store-release.mjs", "appstore:evidence-check", "Verification script includes release evidence check");
requireText("scripts/verify-app-store-release.mjs", "--strict", "Verification script supports strict mode");
requireText("scripts/verify-app-store-release.mjs", "Hard release verification passed", "Verification script allows manual TODOs");
requireText("scripts/check-release-evidence.mjs", "Release evidence output did not include JSON", "Release evidence check parses evidence JSON");
requireText("scripts/check-release-evidence.mjs", "App Privacy evidence packet", "Release evidence check verifies App Privacy packet");
requireText("scripts/check-release-evidence.mjs", "Final signoff readiness", "Release evidence check verifies final signoff");
requireText("scripts/check-release-evidence.mjs", "Submission screenshots ready", "Release evidence check verifies screenshot readiness");
requireText("scripts/check-release-evidence.mjs", "Xcode evidence packet", "Release evidence check verifies Xcode evidence packet");
requireText("scripts/check-release-evidence.mjs", "Full Xcode selected", "Release evidence check verifies Xcode");
requireText("scripts/generate-release-evidence.mjs", "releaseStatus", "Release evidence includes status");
requireText("scripts/generate-release-evidence.mjs", "appstore:privacy", "Release evidence includes App Privacy packet target");
requireText("scripts/generate-release-evidence.mjs", "finalSignoff", "Release evidence includes final signoff state");
requireText("scripts/generate-release-evidence.mjs", "screenshots", "Release evidence includes screenshot state");
requireText("scripts/generate-release-evidence.mjs", "screenshotPacket", "Release evidence includes screenshot packet target");
requireText("scripts/generate-release-evidence.mjs", "xcodePacket", "Release evidence includes Xcode packet target");
requireText("scripts/generate-release-evidence.mjs", "readyForArchive", "Release evidence includes Xcode archive readiness");
requireText("scripts/generate-release-evidence.mjs", "missingFields", "Release evidence includes missing final signoff fields");
requireText("scripts/generate-release-evidence.mjs", "publicUrlsReachable", "Release evidence includes public URL reachability");
requireText("scripts/generate-release-evidence.mjs", "remoteGhPages", "Release evidence includes Pages branch");
requireText("scripts/generate-release-evidence.mjs", "nextStrictGate", "Release evidence includes strict gate");
requireText("tests/backup-cli.test.ts", "backup validation CLI accepts", "Backup validation CLI success test exists");
requireText("tests/backup-cli.test.ts", "rejects duplicate normalized management numbers", "Backup validation CLI failure test exists");
requireText("tests/fixtures/valid-backup.json", "\"managementNumber\": \"CH-900\"", "Valid backup fixture exists");
requireText("scripts/print-app-store-metadata.mjs", "fieldLimits", "Metadata print includes field limits");
requireText("scripts/print-app-store-metadata.mjs", "maxBytes: 100", "Metadata print validates keyword byte limit");
requireText("scripts/print-app-store-metadata.mjs", "used > max", "Metadata print fails on field limit overflow");
requireText("docs/app-age-rating-answers.md", "Expected App Store rating: 4+", "Age rating answers expect 4+");
requireText("docs/app-age-rating-answers.md", "Unrestricted web access | No", "Age rating answers block unrestricted web");
requireText("docs/app-age-rating-answers.md", "Gambling or simulated gambling | No", "Age rating answers block gambling");
requireText("docs/app-age-rating-answers.md", "Medical or wellness topics | No", "Age rating answers block medical content");
requireText("docs/app-age-rating-answers.md", "Camera: Yes", "Age rating answers document camera use");
requireText("scripts/print-app-privacy-answers.mjs", "dataCollected", "App Privacy script exports Data Collected answer");
requireText("scripts/print-app-privacy-answers.mjs", "manifestChecks", "App Privacy script validates privacy manifest assumptions");
requireText("scripts/print-app-store-connect-packet.mjs", "docs/app-privacy-answers.md", "Connect packet includes privacy source");
requireText("scripts/print-app-age-rating-answers.mjs", "questionnaireDraft", "Age rating script exports questionnaire draft");
requireText("scripts/print-app-store-connect-packet.mjs", "docs/app-age-rating-answers.md", "Connect packet includes age rating source");
requireText("docs/app-accessibility-answers.md", "Accessibility Nutrition Labels", "Accessibility answers title");
requireText("docs/app-accessibility-answers.md", "VoiceOver", "Accessibility answers include VoiceOver");
requireText("docs/app-accessibility-answers.md", "Voice Control", "Accessibility answers include Voice Control");
requireText("docs/app-accessibility-answers.md", "Larger Text", "Accessibility answers include Larger Text");
requireText("docs/app-accessibility-answers.md", "Do not claim yet", "Accessibility answers are conservative");
requireText("scripts/print-app-accessibility-answers.mjs", "commonTasks", "Accessibility script exports common tasks");
requireText("scripts/print-app-store-connect-packet.mjs", "docs/app-accessibility-answers.md", "Connect packet includes accessibility source");
requireText("scripts/set-release-version.mjs", "public/support.html", "Release version script updates support page");
requireText("scripts/set-release-version.mjs", "docs/support.html", "Release version script updates Pages support page");
requireText("scripts/app-store-release-status.mjs", "Formal support contact", "Release status checks support contact");
requireText("scripts/app-store-release-status.mjs", "App Store copyright holder", "Release status checks App Store copyright holder");
requireText("scripts/app-store-release-status.mjs", "formalSupportContactReady", "Release status requires concrete support contact");
requireText("scripts/app-store-release-status.mjs", "privacyContactReady", "Release status requires concrete privacy contact");
requireText("scripts/app-store-release-status.mjs", "hasConcreteContact", "Release status uses shared concrete contact detection");
requireText("scripts/app-store-release-status.mjs", "mailto:", "Release status accepts mailto support contact");
requireText("scripts/app-store-release-status.mjs", "tel:", "Release status accepts telephone support contact");
requireText("scripts/app-store-release-status.mjs", "Hosted privacy/support URLs", "Release status checks hosted URLs");
requireText("scripts/app-store-release-status.mjs", "pagesBuildBlocked", "Release status blocks failed Pages builds");
requireText("scripts/app-store-release-status.mjs", "Final App Review signoff", "Release status checks final signoff");
requireText("scripts/app-store-release-status.mjs", "^Status: Ready for App Review$", "Release status checks exact final signoff status");
requireText("scripts/app-store-release-status.mjs", "requiredSignoffFields", "Release status requires final signoff evidence fields");
requireText("scripts/app-store-release-status.mjs", "todoCount > 0", "Release status fails when TODO items remain");
requireText("scripts/app-store-release-status.mjs", "Status summary", "Release status prints summary");
requireText("scripts/app-store-release-status.mjs", "Next required inputs", "Release status prints next required inputs");
requireText("scripts/app-store-release-status.mjs", "Publishing status", "Release status prints publishing status");
requireText("scripts/app-store-release-status.mjs", "gh-pages branch", "Release status reports Pages branch readiness");
requireText("scripts/app-store-release-status.mjs", "Pages-capable plan", "Release status reports hosting plan decision");
requireText("scripts/app-store-release-status.mjs", "appstore:apply-inputs", "Release status points to input application command");
requireText("scripts/app-store-release-status.mjs", "public/privacy.html and docs/privacy.html: replace the placeholder", "Release status points to privacy contact input");
requireText("scripts/app-store-release-status.mjs", "public/support.html and docs/support.html: replace the placeholder", "Release status points to support contact input");
requireText("scripts/app-store-release-status.mjs", "docs/privacy.html", "Release status checks Pages privacy contact");
requireText("scripts/app-store-release-status.mjs", "docs/support.html", "Release status checks Pages support contact");
requireText("README.md", "npm run appstore:status", "README includes release status command");
requireText("README.md", "npm run appstore:metadata", "README includes metadata print command");
requireText("README.md", "npm run appstore:connect-packet", "README includes App Store Connect packet command");
requireText("README.md", "npm run appstore:submission-checklist", "README includes submission checklist command");
requireText("README.md", "npm run appstore:privacy", "README includes App Privacy command");
requireText("README.md", "--copyright-holder", "README includes copyright holder input");
requireText("README.md", "npm run appstore:rating", "README includes age rating command");
requireText("README.md", "npm run appstore:accessibility", "README includes accessibility command");
requireText("README.md", "npm run appstore:handoff", "README includes release handoff command");
requireText("README.md", "npm run appstore:screenshots:submission", "README includes submission screenshot command");
requireText("README.md", "npm run appstore:signoff-draft", "README includes signoff draft command");
requireText("README.md", "npm run appstore:signoff-template", "README includes signoff template command");
requireText("README.md", "npm run appstore:preflight", "README includes App Store preflight command");
requireText("README.md", "npm run appstore:evidence", "README includes evidence command");
requireText("README.md", "npm run appstore:evidence-check", "README includes evidence check command");
requireText("README.md", "npm run backup:validate", "README includes backup validation command");
requireText("README.md", "npm run appstore:verify", "README includes verification command");
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
requireText("docs/app-review-final-signoff.md", "npm run appstore:evidence", "Final signoff includes evidence command");
requireText("docs/app-review-final-signoff.md", "npm run appstore:evidence-check -- --strict", "Final signoff includes strict evidence check");
requireText("docs/app-review-final-signoff.md", "npm run appstore:signoff-draft", "Final signoff includes signoff draft command");
requireText("docs/app-review-final-signoff.md", "npm run appstore:signoff-template", "Final signoff includes signoff template command");
requireText("docs/app-review-final-signoff.md", "npm run appstore:preflight", "Final signoff includes preflight command");
requireText("docs/app-review-final-signoff.md", "npm run appstore:xcode-packet", "Final signoff includes Xcode evidence command");
requireText("docs/app-review-final-signoff.md", "TODO Resolution Inputs", "Final signoff includes TODO resolution inputs");
requireText("docs/app-review-final-signoff.md", "npm run appstore:apply-inputs", "Final signoff documents release input application command");
requireText("docs/app-review-final-signoff.md", "Backup validation file", "Final signoff records backup validation file");
requireText("docs/app-review-final-signoff.md", "Backup import result", "Final signoff records backup import result");
requireText("docs/app-review-final-signoff.md", "Public URL verification result", "Final signoff records public URL verification");
requireText("docs/app-review-final-signoff.md", "Strict verification result", "Final signoff records strict verification result");
requireText("docs/app-review-final-signoff.md", "Accessibility label result", "Final signoff records accessibility result");
requireText("docs/app-review-final-signoff.md", "Age rating result", "Final signoff records age rating result");
requireText("docs/app-review-final-signoff.md", "xcode-app-store-upload-guide.md", "Final signoff links Xcode upload guide");
requireText("docs/app-review-final-signoff.md", "Formal support contact", "Final signoff maps support contact TODO");
requireText("docs/app-review-final-signoff.md", "Privacy policy contact", "Final signoff maps privacy contact TODO");
requireText("docs/app-review-final-signoff.md", "Copyright holder", "Final signoff maps copyright holder TODO");
requireText("docs/app-review-final-signoff.md", "docs/support.html", "Final signoff maps Pages support contact target");
requireText("docs/app-review-final-signoff.md", "docs/privacy.html", "Final signoff maps Pages privacy contact target");
requireText("docs/app-store-submission-packet.md", "docs/privacy.html", "Submission packet includes Pages privacy source");
requireText("docs/app-store-submission-packet.md", "docs/support.html", "Submission packet includes Pages support source");
requireText("docs/privacy-policy-draft.md", "Concrete contact information", "Privacy policy draft requires concrete contact");
requireText("docs/app-store-review-answers.md", "concrete `mailto:` link", "Review answers require concrete support contact");
requireText("docs/testflight-release-checklist.md", "npm run appstore:status", "TestFlight checklist includes release status");
requireText("docs/testflight-release-checklist.md", "npm run appstore:evidence", "TestFlight checklist includes evidence command");
requireText("docs/testflight-release-checklist.md", "npm run backup:validate", "TestFlight checklist includes backup validation");
requireText("docs/testflight-release-checklist.md", "npm run appstore:verify", "TestFlight checklist includes verification command");
requireText("docs/testflight-release-checklist.md", "npm run appstore:public-urls", "TestFlight checklist includes public URL verification");
requireText("docs/testflight-release-checklist.md", "npm run appstore:testflight-packet", "TestFlight checklist includes evidence packet command");
requireText("docs/testflight-release-checklist.md", "Exported backup filename", "TestFlight checklist records backup evidence");
requireText("docs/testflight-release-checklist.md", "Status: Ready for App Review", "TestFlight checklist includes final signoff ready marker");
requireText("docs/testflight-release-checklist.md", "open ios/App/App.xcodeproj", "TestFlight checklist opens Xcode project");
requireText("docs/testflight-release-checklist.md", "Camera permission denial and retry path", "TestFlight checklist covers camera permission denial");
requireText("docs/testflight-release-checklist.md", "xcode-app-store-upload-guide.md", "TestFlight checklist links Xcode upload guide");
requireText("docs/app-store-submission-packet.md", "app-review-final-signoff.md", "Submission packet links final signoff");
requireText("docs/xcode-app-store-upload-guide.md", "sudo xcode-select -s /Applications/Xcode.app/Contents/Developer", "Xcode guide selects full Xcode");
requireText("docs/xcode-app-store-upload-guide.md", "npm run appstore:xcode-packet", "Xcode guide includes evidence packet");
requireText("docs/xcode-app-store-upload-guide.md", "Product > Archive", "Xcode guide covers archive");
requireText("docs/xcode-app-store-upload-guide.md", "Distribute App", "Xcode guide covers upload");
requireText("docs/xcode-app-store-upload-guide.md", "npm run appstore:connect-packet", "Xcode guide uses transfer packet");
requireText("docs/xcode-app-store-upload-guide.md", "npm run appstore:verify -- --strict", "Xcode guide includes strict verification");
requireText("scripts/print-app-review-signoff-draft.mjs", "App Review Signoff Draft", "Signoff draft prints heading");
requireText("scripts/print-app-review-signoff-draft.mjs", "npm run appstore:public-urls", "Signoff draft records public URL check");
requireText("scripts/print-app-review-signoff-draft.mjs", "npm run appstore:status", "Signoff draft records release status");
requireText("scripts/print-screenshot-evidence-packet.mjs", "generationCommand", "Screenshot packet records generation command");
requireText("scripts/print-screenshot-evidence-packet.mjs", "1320x2868", "Screenshot packet validates 6.9 inch size");
requireText("scripts/print-screenshot-evidence-packet.mjs", "1242x2688", "Screenshot packet validates 6.5 inch size");
requireText("scripts/print-xcode-evidence-packet.mjs", "readyForArchive", "Xcode packet records archive readiness");
requireText("scripts/print-xcode-evidence-packet.mjs", "app-store-connect-app-id", "Xcode packet maps App Store Connect app ID signoff");
requireText("scripts/print-xcode-evidence-packet.mjs", "uploaded-build", "Xcode packet maps uploaded build signoff");
requireText("scripts/print-testflight-evidence-packet.mjs", "backupValidationCommand", "TestFlight packet records backup validation command");
requireText("scripts/print-testflight-evidence-packet.mjs", "signoffCommandFragment", "TestFlight packet maps evidence to signoff command fragment");
requireText("scripts/print-release-signoff-command.mjs", "replacePlaceholdersBeforeUse", "Signoff command lists placeholder inputs");
requireText("scripts/print-release-signoff-command.mjs", "npm run appstore:apply-inputs", "Signoff command prints apply-inputs command");
requireText("scripts/print-release-signoff-command.mjs", "--mark-ready", "Signoff command includes ready marker after placeholders");
requireText("scripts/print-release-input-template.mjs", "release-inputs.json", "Signoff template prints JSON file name");
requireText("scripts/print-release-input-template.mjs", "copyright-holder", "Signoff template includes copyright holder");
requireText("scripts/print-release-input-template.mjs", "appstore:apply-inputs -- --inputs-file", "Signoff template prints JSON apply command");
requireText("scripts/print-app-store-submission-checklist.mjs", "remainingManualScreens", "Submission checklist reports manual screens");
requireText("scripts/print-app-store-submission-checklist.mjs", "appstore:privacy", "Submission checklist includes App Privacy packet");
requireText("scripts/print-app-store-submission-checklist.mjs", "App Review Information", "Submission checklist includes review information screen");
requireText("scripts/print-app-store-preflight.mjs", "appstore:connect-packet", "Preflight includes App Store Connect packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:submission-checklist", "Preflight includes App Store submission checklist");
requireText("scripts/print-app-store-preflight.mjs", "appstore:privacy", "Preflight includes App Privacy packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:rating", "Preflight includes age rating packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:accessibility", "Preflight includes accessibility packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:screenshot-packet", "Preflight includes screenshot evidence packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:xcode-packet", "Preflight includes Xcode evidence packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:testflight-packet", "Preflight includes TestFlight evidence packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:handoff", "Preflight includes release handoff packet");
requireText("scripts/print-app-store-preflight.mjs", "appstore:signoff-draft", "Preflight includes signoff draft");
requireText("scripts/print-app-store-preflight.mjs", "appstore:signoff-command", "Preflight includes signoff command");
requireText("scripts/print-app-store-preflight.mjs", "appstore:signoff-template", "Preflight includes signoff template");
requireText("scripts/print-app-store-preflight.mjs", "expectedManualTodoCount: 5", "Preflight records expected manual TODO count");
requireText("scripts/generate-release-evidence.mjs", "hostedPrivacyPageSource", "Release evidence includes hosted privacy source");
requireText("scripts/generate-release-evidence.mjs", "hostedSupportPageSource", "Release evidence includes hosted support source");

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

const unitTests = run("npm", ["run", "test:unit"]);
addCheck("Unit tests", unitTests.ok ? "pass" : "fail", unitTests.output.split("\n").slice(-12).join("\n"));

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

const connectPacket = run("npm", ["run", "appstore:connect-packet"]);
const connectPacketOk =
  connectPacket.ok &&
  connectPacket.output.includes('"privacyPolicy": "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html"') &&
  connectPacket.output.includes('"support": "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html"') &&
  connectPacket.output.includes('"todo": 5');
addCheck(
  "App Store Connect packet print",
  connectPacketOk ? "pass" : "fail",
  connectPacket.output.split("\n").slice(-12).join("\n"),
);

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
