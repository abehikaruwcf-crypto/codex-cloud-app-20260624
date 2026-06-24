import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = join(root, "work", "unit-tests");
const testFiles = [
  "matching-and-learning.test.ts",
  "backup-cli.test.ts",
  "release-inputs-cli.test.ts",
  "release-inputs-validator.test.ts",
  "release-status-cli.test.ts",
  "app-privacy-answers.test.ts",
  "app-store-preflight.test.ts",
  "app-store-connect-fields.test.ts",
  "app-store-submission-checklist.test.ts",
  "screenshot-evidence-packet.test.ts",
  "xcode-evidence-packet.test.ts",
  "testflight-evidence-packet.test.ts",
  "release-handoff-packet.test.ts",
  "release-signoff-command.test.ts",
  "release-input-template.test.ts",
  "release-version-cli.test.ts",
  "release-evidence.test.ts",
];

mkdirSync(outdir, { recursive: true });

for (const testFile of testFiles) {
  const outfile = join(outdir, testFile.replace(/\.ts$/, ".mjs"));

  await build({
    entryPoints: [join(root, "tests", testFile)],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    sourcemap: "inline",
    logLevel: "silent",
    external: [
      "node:assert/strict",
      "node:child_process",
      "node:fs",
      "node:os",
      "node:path",
      "node:test",
    ],
  });

  await import(`file://${outfile}?v=${Date.now()}`);
}
