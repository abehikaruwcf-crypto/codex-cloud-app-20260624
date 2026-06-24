import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outdir = join(root, "work", "unit-tests");
const outfile = join(outdir, "charm-id-unit-tests.mjs");

mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [join(root, "tests", "matching-and-learning.test.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: "inline",
  logLevel: "silent",
  external: ["node:assert/strict", "node:test"],
});

await import(`file://${outfile}?v=${Date.now()}`);
