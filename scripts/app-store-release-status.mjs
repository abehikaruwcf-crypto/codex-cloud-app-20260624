import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function hasFile(path) {
  return existsSync(join(root, path));
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function readText(path) {
  return readFileSync(join(root, path), "utf8");
}

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim(),
    };
  }
}

function mark(ok) {
  return ok ? "PASS" : "TODO";
}

function hasConcreteContact(content) {
  return (
    /mailto:[^"'\s>]+@[^"'\s>]+/i.test(content) ||
    /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(content) ||
    /tel:\+?[0-9][0-9()\-\s]+/i.test(content)
  );
}

const packageVersion = hasFile("package.json") ? readJson("package.json").version : "unknown";
const xcode = run("xcodebuild", ["-version"]);
const xcodeSelected = xcode.ok && xcode.output.includes("Xcode");
const supportPage = hasFile("public/support.html") ? readText("public/support.html") : "";
const privacyPage = hasFile("public/privacy.html") ? readText("public/privacy.html") : "";
const pagesWorkflow = hasFile("docs/github-pages-workflow.md") ? readText("docs/github-pages-workflow.md") : "";
const finalSignoff = hasFile("docs/app-review-final-signoff.md")
  ? readText("docs/app-review-final-signoff.md")
  : "";
const hasSupportPlaceholder =
  supportPage.includes("正式なサポート連絡先") || supportPage.includes("配布元の担当者");
const hasPrivacyPlaceholder =
  privacyPage.includes("アプリ提供元まで") || privacyPage.includes("お問い合わせは、アプリ提供元");
const hasSupportContact = hasConcreteContact(supportPage);
const hasPrivacyContact = hasConcreteContact(privacyPage);
const formalSupportContactReady = !hasSupportPlaceholder && hasSupportContact;
const privacyContactReady = !hasPrivacyPlaceholder && hasPrivacyContact;
const hostedUrlsReady =
  !pagesWorkflow.includes("https://<owner>.github.io/<repo>/privacy.html") &&
  !pagesWorkflow.includes("https://<owner>.github.io/<repo>/support.html");
const finalSignoffReady = /^Status: Ready for App Review$/m.test(finalSignoff);

const checks = [
  {
    ok: hasFile("ios/App/App.xcodeproj"),
    title: "iOS Xcode project",
    detail: "ios/App/App.xcodeproj",
  },
  {
    ok: hasFile("public/privacy.html") && hasFile("public/support.html"),
    title: "Public policy/support pages",
    detail: "public/privacy.html and public/support.html",
  },
  {
    ok: formalSupportContactReady,
    title: "Formal support contact",
    detail: formalSupportContactReady
      ? "public/support.html includes a concrete support contact."
      : "Replace support-page placeholder with a concrete mailto, email address, or telephone contact.",
  },
  {
    ok: privacyContactReady,
    title: "Privacy policy contact",
    detail: privacyContactReady
      ? "public/privacy.html includes a concrete privacy contact."
      : "Replace privacy-page placeholder with a concrete mailto, email address, or telephone contact.",
  },
  {
    ok: hostedUrlsReady,
    title: "Hosted privacy/support URLs",
    detail: hostedUrlsReady
      ? "Final hosted URLs are documented."
      : "Enable GitHub Pages or another host, then replace <owner>/<repo> URL placeholders.",
  },
  {
    ok: hasFile("docs/app-store-submission-packet.md"),
    title: "Submission packet",
    detail: "docs/app-store-submission-packet.md",
  },
  {
    ok: hasFile("docs/app-store-review-answers.md"),
    title: "Review answers",
    detail: "docs/app-store-review-answers.md",
  },
  {
    ok: hasFile("docs/testflight-release-checklist.md"),
    title: "TestFlight checklist",
    detail: "docs/testflight-release-checklist.md",
  },
  {
    ok: finalSignoffReady,
    title: "Final App Review signoff",
    detail: finalSignoffReady
      ? "docs/app-review-final-signoff.md is marked ready."
      : "Complete docs/app-review-final-signoff.md and mark Status: Ready for App Review.",
  },
  {
    ok: xcodeSelected,
    title: "Full Xcode selected",
    detail: xcodeSelected ? xcode.output.split("\n")[0] : "Run: sudo xcode-select -s /Applications/Xcode.app/Contents/Developer",
  },
];

const manualBlockers = [
  "Select Apple Developer Program team in Xcode.",
  "Create App Store Connect app record for Bundle ID com.wcf.charmid.",
  "Enable/publish public Privacy Policy and Support URLs.",
  "Replace the support-page placeholder with a concrete mailto, email address, or telephone contact.",
  "Replace the privacy-page placeholder with a concrete mailto, email address, or telephone contact.",
  "Capture final App Store screenshots from release build at Apple-supported sizes.",
  "Run physical iPhone TestFlight validation.",
  "Complete docs/app-review-final-signoff.md.",
  "Archive and upload from Xcode Organizer.",
];

const nextInputs = [
  "public/support.html: replace the placeholder with a concrete app support contact.",
  "public/privacy.html: replace the placeholder with a concrete privacy contact.",
  "docs/github-pages-workflow.md and App Store Connect: replace placeholder Pages URLs with final public Privacy/Support URLs.",
  "docs/app-review-final-signoff.md: record Xcode, App Store Connect, uploaded build, TestFlight, URL, contact, owner, and date evidence.",
  "docs/app-review-final-signoff.md: change Status to Ready for App Review only after appstore:status reports 0 todo.",
];

console.log(`Charm ID App Store Release Status`);
console.log(`Version: ${packageVersion}`);
console.log("");

for (const check of checks) {
  console.log(`[${mark(check.ok)}] ${check.title}: ${check.detail}`);
}

const todoCount = checks.filter((check) => !check.ok).length;

console.log("");
console.log("Manual items before App Review:");
for (const blocker of manualBlockers) {
  console.log(`- ${blocker}`);
}

console.log("");
console.log("Next required inputs:");
for (const input of nextInputs) {
  console.log(`- ${input}`);
}

console.log("");
console.log("Recommended release gate:");
console.log("1. npm run appstore:audit");
console.log("2. npm run ios:sync");
console.log("3. Complete docs/testflight-release-checklist.md");

console.log("");
console.log(`Status summary: ${checks.length - todoCount} pass, ${todoCount} todo`);

if (todoCount > 0) {
  process.exitCode = 1;
}
