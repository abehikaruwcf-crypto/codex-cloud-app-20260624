import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = join(root, "work", "unit-tests");
const testFiles = [
  "matching-and-learning.test.ts",
  "backup-cli.test.ts",
  "release-inputs-cli.test.ts",
  "release-status-cli.test.ts",
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
