const qaTasks = [
  "First launch onboarding",
  "Demo data load",
  "Six-angle registration",
  "Single-angle identification",
  "Multi-angle identification",
  "Correct-result selection",
  "Learning confirmation",
  "Backup export",
  "Backup CLI validation",
  "Backup import on physical iPhone",
  "Backup import cancellation keeps existing data",
  "Backup import replacement succeeds after confirmation",
  "Local data reset",
  "Camera permission denial and retry path",
  "Privacy and support links open",
];

const evidenceFields = [
  {
    key: "testflight-device",
    label: "TestFlight device",
    example: "iPhone 15 Pro / iOS 18.5 / TestFlight build 1.0 (1)",
  },
  {
    key: "backup-validation-file",
    label: "Backup validation file",
    example: "charm-id-backup-2026-06-25.json",
  },
  {
    key: "backup-validation-result",
    label: "Backup validation result",
    example: "passed with npm run backup:validate -- charm-id-backup-2026-06-25.json",
  },
  {
    key: "backup-import-result",
    label: "Backup import result",
    example: "passed on physical iPhone after replacement confirmation",
  },
  {
    key: "accessibility-label-result",
    label: "Accessibility label result",
    example: "reviewed common tasks; no accessibility claims selected",
  },
  {
    key: "age-rating-result",
    label: "Age rating result",
    example: "4+ confirmed in App Store Connect",
  },
];

const commandFragment = evidenceFields
  .map((field) => `--${field.key} '<${field.key}>'`)
  .join(" ");

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Record physical iPhone TestFlight evidence before final App Review signoff.",
  sourceDoc: "docs/testflight-release-checklist.md",
  qaTasks,
  evidenceFields,
  backupValidationCommand: "npm run backup:validate -- <exported-backup.json>",
  signoffCommandFragment: commandFragment,
  finalCommandSource: "npm run appstore:signoff-command",
};

console.log(JSON.stringify(packet, null, 2));

