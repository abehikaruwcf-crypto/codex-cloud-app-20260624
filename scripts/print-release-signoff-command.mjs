import { execFileSync } from "node:child_process";

const privacyUrl = "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html";
const supportUrl = "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html";

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
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

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}

const head = run("git", ["rev-parse", "HEAD"]);
const publicUrls = run("npm", ["run", "appstore:public-urls"]);
const strictGate = "npm run appstore:verify -- --strict";
const generatedAt = new Date().toISOString();

const values = {
  "support-contact": "<support-contact>",
  "privacy-contact": "<privacy-contact>",
  "copyright-holder": "<copyright-holder>",
  "privacy-url": privacyUrl,
  "support-url": supportUrl,
  "release-commit": head.ok ? head.output : "<release-commit>",
  "evidence-report-generated": generatedAt,
  "app-store-connect-app-id": "<app-store-connect-app-id>",
  "uploaded-build": "<uploaded-build>",
  "testflight-device": "<testflight-device>",
  "backup-validation-file": "<backup-validation-file>",
  "backup-validation-result": "<backup-validation-result>",
  "backup-import-result": "<backup-import-result>",
  "public-url-verification-result": publicUrls.ok ? "passed with npm run appstore:public-urls" : "<public-url-verification-result>",
  "strict-verification-result": `<result of ${strictGate}>`,
  "accessibility-label-result": "<accessibility-label-result>",
  "age-rating-result": "<age-rating-result>",
  "signoff-owner": "<signoff-owner>",
  "signoff-date": "<yyyy-mm-dd>",
};

const args = Object.entries(values).flatMap(([key, value]) => [`--${key}`, shellQuote(value)]);
const command = `npm run appstore:apply-inputs -- ${args.join(" ")} --mark-ready`;

const packet = {
  generatedAt,
  purpose: "Fill final App Review signoff evidence after manual release checks are complete.",
  readyToUse: false,
  replacePlaceholdersBeforeUse: Object.entries(values)
    .filter(([, value]) => /^<.+>$/.test(value))
    .map(([key]) => key),
  prerequisites: [
    "Full Xcode is selected and archive upload has completed.",
    "App Store Connect app record exists for Bundle ID com.wcf.charmid.",
    "Physical iPhone TestFlight validation is complete.",
    "Backup export validates and imports successfully on the release build.",
    "Accessibility and age rating answers are reviewed in App Store Connect.",
    "npm run appstore:verify -- --strict passes.",
  ],
  command,
};

console.log(JSON.stringify(packet, null, 2));
