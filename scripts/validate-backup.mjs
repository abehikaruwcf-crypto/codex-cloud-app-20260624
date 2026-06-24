import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const backupPath = process.argv[2];

function usage() {
  console.log("Usage: npm run backup:validate -- path/to/charm-id-backup.json");
}

if (!backupPath) {
  usage();
  process.exit(1);
}

const resolvedBackupPath = resolve(root, backupPath);

if (!existsSync(resolvedBackupPath)) {
  console.error(`Backup file not found: ${backupPath}`);
  process.exit(1);
}

const outdir = join(root, "work", "backup-validator");
const outfile = join(outdir, "backup-validator-bundle.mjs");

mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [join(root, "src", "backup.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  sourcemap: "inline",
  logLevel: "silent",
});

const { normalizeBackupPayload, validateBackupPayload } = await import(
  `file://${outfile}?v=${Date.now()}`
);

let parsed;
try {
  parsed = JSON.parse(readFileSync(resolvedBackupPath, "utf8"));
} catch (error) {
  console.error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

let generatedId = 0;
const backup = normalizeBackupPayload(parsed, {
  makeId: (prefix) => `${prefix}-validated-${(generatedId += 1)}`,
  now: () => new Date().toISOString(),
});

if (!backup) {
  console.error("Invalid backup: no valid charm records found.");
  process.exit(1);
}

const validationError = validateBackupPayload(parsed, backup);

if (validationError) {
  console.error(`Invalid backup: ${validationError}`);
  process.exit(1);
}

const imageCount = backup.charms.reduce((total, charm) => total + charm.images.length, 0);
const learnedImageCount = backup.charms.reduce(
  (total, charm) =>
    total + charm.images.filter((image) => image.source === "confirmed-identification").length,
  0,
);

console.log("Backup validation passed.");
console.log(`- Charms: ${backup.charms.length}`);
console.log(`- Images: ${imageCount}`);
console.log(`- Learned images: ${learnedImageCount}`);
console.log(`- Decision logs: ${backup.decisionLogs.length}`);
