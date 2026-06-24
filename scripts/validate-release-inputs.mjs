import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const root = process.cwd();
const args = process.argv.slice(2);

const signoffKeys = [
  "release-commit",
  "evidence-report-generated",
  "app-store-connect-app-id",
  "uploaded-build",
  "testflight-device",
  "backup-validation-file",
  "backup-validation-result",
  "backup-import-result",
  "public-url-verification-result",
  "strict-verification-result",
  "accessibility-label-result",
  "age-rating-result",
  "signoff-owner",
  "signoff-date",
];

const requiredKeys = [
  "support-contact",
  "privacy-contact",
  "copyright-holder",
  "privacy-url",
  "support-url",
  ...signoffKeys,
];

const validKeys = new Set([...requiredKeys, "mark-ready"]);

function usage() {
  console.log(`Usage:
  npm run appstore:validate-inputs -- release-inputs.json

Validates a final release-inputs.json file before applying it with:
  npm run appstore:apply-inputs -- --inputs-file release-inputs.json --mark-ready
`);
}

function hasConcreteContact(value) {
  return (
    /^mailto:[^"'\s>]+@[^"'\s>]+$/i.test(value) ||
    /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value) ||
    /^tel:\+?[0-9][0-9()\-\s]+$/i.test(value) ||
    /^\+?[0-9][0-9()\-\s]{6,}$/.test(value)
  );
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  return typeof value === "string" && /^<.+>$/.test(value.trim());
}

function readInputsFile(path) {
  const fullPath = isAbsolute(path) ? path : join(root, path);
  if (!existsSync(fullPath)) {
    throw new Error(`Input file not found: ${path}`);
  }

  const parsed = JSON.parse(readFileSync(fullPath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Input file must contain a JSON object.");
  }

  return parsed;
}

function addInvalid(invalid, key, reason) {
  invalid.push({ key, reason });
}

function validate(values) {
  const missing = requiredKeys.filter((key) => !(key in values));
  const placeholders = Object.entries(values)
    .filter(([, value]) => isPlaceholder(value))
    .map(([key]) => key);
  const unknown = Object.keys(values).filter((key) => !validKeys.has(key));
  const blank = requiredKeys.filter((key) => typeof values[key] === "string" && values[key].trim().length === 0);
  const invalid = [];

  if (values["support-contact"] && !isPlaceholder(values["support-contact"]) && !hasConcreteContact(values["support-contact"])) {
    addInvalid(invalid, "support-contact", "Use an email, mailto link, tel link, or telephone number.");
  }
  if (values["privacy-contact"] && !isPlaceholder(values["privacy-contact"]) && !hasConcreteContact(values["privacy-contact"])) {
    addInvalid(invalid, "privacy-contact", "Use an email, mailto link, tel link, or telephone number.");
  }
  if (values["privacy-url"] && !isPlaceholder(values["privacy-url"]) && !isHttpsUrl(values["privacy-url"])) {
    addInvalid(invalid, "privacy-url", "Use a valid https URL.");
  }
  if (values["support-url"] && !isPlaceholder(values["support-url"]) && !isHttpsUrl(values["support-url"])) {
    addInvalid(invalid, "support-url", "Use a valid https URL.");
  }
  if (
    values["copyright-holder"] &&
    !isPlaceholder(values["copyright-holder"]) &&
    String(values["copyright-holder"]).trim().length < 2
  ) {
    addInvalid(invalid, "copyright-holder", "Use the legal copyright holder name entered in App Store Connect.");
  }

  const patterns = [
    ["release-commit", /^[0-9a-f]{7,40}$/i, "Use a git SHA such as abc1234."],
    [
      "evidence-report-generated",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      "Use an ISO UTC timestamp such as 2026-06-25T00:00:00Z.",
    ],
    ["app-store-connect-app-id", /^\d{6,12}$/, "Use the numeric App Store Connect app ID."],
    ["uploaded-build", /^\d+\.\d+(?:\.\d+)? \(\d+\)$/, "Use a version/build pair such as 1.0 (1)."],
    ["signoff-date", /^\d{4}-\d{2}-\d{2}$/, "Use a date such as 2026-06-25."],
  ];

  for (const [key, pattern, reason] of patterns) {
    if (values[key] && !isPlaceholder(values[key]) && !pattern.test(values[key])) {
      addInvalid(invalid, key, reason);
    }
  }

  for (const key of [
    "backup-validation-result",
    "backup-import-result",
    "public-url-verification-result",
    "strict-verification-result",
    "accessibility-label-result",
    "age-rating-result",
  ]) {
    const value = String(values[key] ?? "");
    if (value && !isPlaceholder(value) && !/pass|passed|confirmed|reviewed|4\+/i.test(value)) {
      addInvalid(invalid, key, "Use concrete passed, confirmed, or reviewed evidence.");
    }
  }

  return {
    ok: missing.length === 0 && placeholders.length === 0 && blank.length === 0 && unknown.length === 0 && invalid.length === 0,
    missing,
    placeholders,
    blank,
    unknown,
    invalid,
  };
}

try {
  const inputPath = args[0];
  if (!inputPath || args.length > 1) {
    usage();
    process.exit(1);
  }

  const values = readInputsFile(inputPath);
  const result = validate(values);
  const packet = {
    inputFile: inputPath,
    readyToApply: result.ok,
    requiredKeys,
    ...result,
    applyCommand: `npm run appstore:apply-inputs -- --inputs-file ${inputPath}`,
    readyCommand: `npm run appstore:apply-inputs -- --inputs-file ${inputPath} --mark-ready`,
    next: result.ok
      ? "Apply the file, then run npm run appstore:status and npm run appstore:evidence-check -- --strict."
      : "Replace missing, blank, placeholder, unknown, or invalid values before applying.",
  };

  console.log(JSON.stringify(packet, null, 2));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  console.error(error.message);
  console.error("");
  usage();
  process.exit(1);
}
