import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const [marketingVersion, buildNumber] = process.argv.slice(2);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!marketingVersion || !buildNumber) {
  fail("Usage: npm run appstore:set-version -- <marketing-version> <build-number>");
}

if (!/^\d+\.\d+(\.\d+)?$/.test(marketingVersion)) {
  fail("Marketing version must look like 1.0 or 1.0.1.");
}

if (!/^\d+$/.test(buildNumber) || Number(buildNumber) < 1) {
  fail("Build number must be a positive integer.");
}

const packageVersion = marketingVersion.split(".").length === 2 ? `${marketingVersion}.0` : marketingVersion;

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function write(path, content) {
  writeFileSync(join(root, path), content);
}

function updateJsonVersion(path) {
  const json = JSON.parse(read(path));
  json.version = packageVersion;
  write(path, `${JSON.stringify(json, null, 2)}\n`);
}

updateJsonVersion("package.json");
updateJsonVersion("package-lock.json");

const projectPath = "ios/App/App.xcodeproj/project.pbxproj";
const project = read(projectPath)
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${marketingVersion};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${buildNumber};`);
write(projectPath, project);

const supportPath = "public/support.html";
if (read(supportPath).includes("Version ")) {
  write(supportPath, read(supportPath).replace(/Version \d+\.\d+\.\d+/g, `Version ${packageVersion}`));
}

console.log(`Release version set: package ${packageVersion}, iOS ${marketingVersion} (${buildNumber})`);
