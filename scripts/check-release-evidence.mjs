import { execFileSync } from "node:child_process";

const strict = process.argv.includes("--strict");

function runEvidence() {
  try {
    const output = execFileSync("npm", ["run", "appstore:evidence"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const jsonStart = output.indexOf("{");

    if (jsonStart === -1) {
      throw new Error("Release evidence output did not include JSON.");
    }

    return JSON.parse(output.slice(jsonStart));
  } catch (error) {
    throw new Error(`Could not generate release evidence:\n${error.stdout ?? error.message}`);
  }
}

function addCheck(checks, ok, title, detail, strictOnly = false) {
  checks.push({ ok, title, detail, strictOnly });
}

const evidence = runEvidence();
const checks = [];

addCheck(
  checks,
  evidence.repository?.remoteMain?.exists === true,
  "Remote main branch",
  evidence.repository?.remoteMain?.sha ?? "origin/main was not found.",
);
addCheck(
  checks,
  evidence.repository?.remoteGhPages?.exists === true,
  "Remote Pages branch",
  evidence.repository?.remoteGhPages?.sha ?? "origin/gh-pages was not found.",
);
addCheck(
  checks,
  evidence.publishing?.publicUrlsReachable === true,
  "Public App Store URLs",
  evidence.publishing?.publicUrlsReachable
    ? "Privacy Policy and Support URLs are reachable."
    : "Run npm run appstore:public-urls and fix public hosting.",
);
addCheck(
  checks,
  evidence.finalSignoff?.exists === true,
  "Final signoff document",
  evidence.finalSignoff?.path ?? "docs/app-review-final-signoff.md is missing.",
);
addCheck(
  checks,
  evidence.evidenceTargets?.hostedPrivacyPageSource === "docs/privacy.html" &&
    evidence.evidenceTargets?.hostedSupportPageSource === "docs/support.html",
  "Hosted page sources",
  "Release evidence must include docs/privacy.html and docs/support.html.",
);
addCheck(
  checks,
  evidence.releaseStatus?.todo === 0,
  "Release status TODOs",
  `${evidence.releaseStatus?.todo ?? "unknown"} todo`,
  true,
);
addCheck(
  checks,
  evidence.finalSignoff?.ready === true,
  "Final signoff readiness",
  evidence.finalSignoff?.ready
    ? "docs/app-review-final-signoff.md is ready."
    : `Missing fields: ${(evidence.finalSignoff?.missingFields ?? []).join(", ") || "unknown"}`,
  true,
);
addCheck(
  checks,
  evidence.xcode?.selected === true,
  "Full Xcode selected",
  evidence.xcode?.selected ? evidence.xcode.output : "Select full Xcode before archive/upload.",
  true,
);

for (const check of checks) {
  const marker = check.ok ? "PASS" : check.strictOnly ? "TODO" : "FAIL";
  console.log(`[${marker}] ${check.title}: ${check.detail}`);
}

const hardFailures = checks.filter((check) => !check.ok && !check.strictOnly);
const strictFailures = checks.filter((check) => !check.ok);

console.log("");
console.log(
  `Evidence check summary: ${checks.length - strictFailures.length} pass, ${strictFailures.length} pending, ${hardFailures.length} hard fail`,
);

if (hardFailures.length > 0 || (strict && strictFailures.length > 0)) {
  process.exit(1);
}
