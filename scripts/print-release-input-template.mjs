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

const fieldGuide = [
  {
    key: "support-contact",
    purpose: "Public support contact shown on the bundled and hosted Support pages.",
    source: "Final support mailbox, mailto link, tel link, or phone number approved for App Review.",
    example: "support@example.com",
    blocksTodo: "Formal support contact",
  },
  {
    key: "privacy-contact",
    purpose: "Public privacy contact shown on the bundled and hosted Privacy pages.",
    source: "Final privacy mailbox, mailto link, tel link, or phone number approved for App Review.",
    example: "privacy@example.com",
    blocksTodo: "Privacy policy contact",
  },
  {
    key: "copyright-holder",
    purpose: "Legal copyright holder entered in App Store Connect.",
    source: "Company or legal owner name used for the App Store listing.",
    example: "WCF Inc.",
    blocksTodo: "App Store copyright holder",
  },
  {
    key: "privacy-url",
    purpose: "Public HTTPS Privacy Policy URL copied into App Store Connect.",
    source: "npm run appstore:public-urls",
    example: privacyUrl,
  },
  {
    key: "support-url",
    purpose: "Public HTTPS Support URL copied into App Store Connect.",
    source: "npm run appstore:public-urls",
    example: supportUrl,
  },
  {
    key: "release-commit",
    purpose: "Git commit used for the release build and final evidence snapshot.",
    source: "git rev-parse HEAD after the final release commit is pushed.",
    example: head.ok ? head.output.slice(0, 7) : "abc1234",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "evidence-report-generated",
    purpose: "Timestamp for the final release evidence report.",
    source: "generatedAt from npm run appstore:evidence on the release commit.",
    example: generatedAt,
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "app-store-connect-app-id",
    purpose: "Numeric App Store Connect app identifier.",
    source: "App Store Connect app information page after creating the app record.",
    example: "1234567890",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "uploaded-build",
    purpose: "Processed build selected in App Store Connect.",
    source: "App Store Connect build picker after Xcode upload finishes processing.",
    example: "1.0 (1)",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "testflight-device",
    purpose: "Physical iPhone used for TestFlight validation.",
    source: "docs/testflight-release-checklist.md after physical QA.",
    example: "iPhone 15 Pro / iOS 18",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "backup-validation-file",
    purpose: "Backup file validated during physical QA.",
    source: "Exported backup filename from TestFlight validation.",
    example: "charm-id-backup-2026-06-25.json",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "backup-validation-result",
    purpose: "Result of validating the exported backup.",
    source: "npm run backup:validate -- <exported-backup.json>",
    example: "passed",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "backup-import-result",
    purpose: "Result of importing a validated backup during QA.",
    source: "Physical iPhone TestFlight checklist.",
    example: "passed on physical iPhone",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "public-url-verification-result",
    purpose: "Evidence that App Store Privacy and Support URLs are reachable.",
    source: "npm run appstore:public-urls",
    example: "passed with npm run appstore:public-urls",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "strict-verification-result",
    purpose: "Final strict release gate result after all TODOs are complete.",
    source: "npm run appstore:verify -- --strict",
    example: "passed with npm run appstore:verify -- --strict",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "accessibility-label-result",
    purpose: "Accessibility review result for the App Store Nutrition Labels answer.",
    source: "Physical iPhone QA and docs/app-accessibility-answers.md.",
    example: "reviewed against physical iPhone test",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "age-rating-result",
    purpose: "Apple-calculated age rating confirmation.",
    source: "App Store Connect age rating screen after answering docs/app-age-rating-answers.md.",
    example: "4+ confirmed in App Store Connect",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "signoff-owner",
    purpose: "Person responsible for submitting the build for review.",
    source: "Release owner name.",
    example: "Release owner",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "signoff-date",
    purpose: "Date the final App Review signoff is approved.",
    source: "Current date at final approval.",
    example: "2026-06-25",
    blocksTodo: "Final App Review signoff",
  },
  {
    key: "mark-ready",
    purpose: "Controls whether apply-inputs marks docs/app-review-final-signoff.md as Ready for App Review.",
    source: "Set to true only after validation passes and every manual App Review check is complete.",
    example: false,
    blocksTodo: "Final App Review signoff",
  },
];

const placeholders = Object.entries(template)
  .filter(([, value]) => typeof value === "string" && /^<.+>$/.test(value))
  .map(([key]) => key);

const packet = {
  generatedAt,
  purpose: "Create a JSON input file for npm run appstore:apply-inputs.",
  template,
  fieldGuide,
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
