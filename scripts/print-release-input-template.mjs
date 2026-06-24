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

function parseJsonOutput(output) {
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    return null;
  }

  try {
    return JSON.parse(output.slice(jsonStart));
  } catch {
    return null;
  }
}

const head = run("git", ["rev-parse", "HEAD"]);
const publicUrls = run("npm", ["run", "appstore:public-urls"]);
const xcodePacket = parseJsonOutput(run("npm", ["run", "appstore:xcode-packet"]).output);
const testflightPacket = parseJsonOutput(run("npm", ["run", "appstore:testflight-packet"]).output);
const generatedAt = new Date().toISOString();

const template = {
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
  "strict-verification-result": "<result of npm run appstore:verify -- --strict>",
  "accessibility-label-result": "<accessibility-label-result>",
  "age-rating-result": "<age-rating-result>",
  "signoff-owner": "<signoff-owner>",
  "signoff-date": "<yyyy-mm-dd>",
  "mark-ready": false,
};

const placeholders = Object.entries(template)
  .filter(([, value]) => typeof value === "string" && /^<.+>$/.test(value))
  .map(([key]) => key);

const packet = {
  generatedAt,
  purpose: "Create a JSON input file for npm run appstore:apply-inputs.",
  template,
  placeholders,
  saveAs: "release-inputs.json",
  validateCommand: "npm run appstore:validate-inputs -- release-inputs.json",
  applyCommand: "npm run appstore:apply-inputs -- --inputs-file release-inputs.json",
  readyCommand: "npm run appstore:apply-inputs -- --inputs-file release-inputs.json --mark-ready",
  sourcePackets: {
    xcode: {
      command: "npm run appstore:xcode-packet",
      readyForArchive: xcodePacket?.readyForArchive ?? false,
      signoffFields: xcodePacket?.signoffFields?.map((field) => field.key) ?? [],
    },
    testflight: {
      command: "npm run appstore:testflight-packet",
      evidenceFields: testflightPacket?.evidenceFields?.map((field) => field.key) ?? [],
    },
  },
  validation: [
    "Replace every placeholder before using --mark-ready.",
    "Use concrete mailto, email, tel, or telephone contacts.",
    "Run npm run appstore:evidence-check -- --strict after applying final values.",
  ],
};

console.log(JSON.stringify(packet, null, 2));
