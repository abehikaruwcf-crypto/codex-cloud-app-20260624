import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: root,
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

function findUrl(content, kind) {
  const match = content.match(new RegExp(`https://[^\\s)]+/${kind}\\.html`));
  return match?.[0] ?? "";
}

function commandSummary(command, args) {
  const result = run(command, args);
  const firstRelevantLine =
    result.output
      .split("\n")
      .reverse()
      .find((line) => line.trim()) ?? "";

  return {
    ok: result.ok,
    summary: firstRelevantLine.trim(),
  };
}

const pagesNotes = read("docs/github-pages-workflow.md");
const status = run("npm", ["run", "appstore:status"]);
const statusSummary = status.output.match(/Status summary: \d+ pass, \d+ todo/)?.[0] ?? "Status summary unavailable";
const publicUrls = commandSummary("npm", ["run", "appstore:public-urls"]);
const xcode = run("xcodebuild", ["-version"]);
const head = run("git", ["rev-parse", "HEAD"]);

const draft = [
  "# App Review Signoff Draft",
  "",
  "Copy the filled values into `docs/app-review-final-signoff.md` only after the release build has been uploaded and tested.",
  "",
  "## Current Release Evidence",
  "",
  `- Release commit: ${head.ok ? head.output : ""}`,
  `- Evidence report generated: ${new Date().toISOString()}`,
  `- App Store Connect app ID: `,
  `- Uploaded build: `,
  `- TestFlight device: `,
  `- Backup validation file: `,
  `- Backup validation result: `,
  `- Backup import result: `,
  `- Public URL verification result: ${publicUrls.ok ? publicUrls.summary : "TODO - npm run appstore:public-urls failed"}`,
  `- Strict verification result: TODO - run npm run appstore:verify -- --strict after all App Review TODOs are resolved`,
  `- Final Privacy Policy URL: ${findUrl(pagesNotes, "privacy")}`,
  `- Final Support URL: ${findUrl(pagesNotes, "support")}`,
  `- Support contact: `,
  `- Privacy contact: `,
  `- Signoff owner: `,
  `- Signoff date: `,
  "",
  "## Current Gate State",
  "",
  `- App Store status: ${statusSummary} from npm run appstore:status`,
  `- Xcode: ${xcode.ok ? xcode.output.split("\n")[0] : "TODO - full Xcode is not selected"}`,
  `- Strict gate: run npm run appstore:verify -- --strict only after appstore:status reports 0 todo`,
  "",
  "## Remaining Manual Inputs",
  "",
  "- Concrete support contact.",
  "- Concrete privacy contact.",
  "- Xcode archive upload evidence.",
  "- App Store Connect app ID.",
  "- TestFlight physical iPhone validation result.",
  "- Backup export/import evidence from the release build.",
].join("\n");

console.log(draft);
