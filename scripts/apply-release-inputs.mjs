import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";

const root = process.cwd();

const args = process.argv.slice(2);

function usage() {
  console.log(`Usage:
  npm run appstore:apply-inputs -- --support-contact support@example.com --privacy-contact privacy@example.com --privacy-url https://example.com/privacy.html --support-url https://example.com/support.html

Options:
  --support-contact  Concrete support email, mailto link, tel link, or telephone number.
  --privacy-contact  Concrete privacy email, mailto link, tel link, or telephone number.
  --privacy-url      Final public Privacy Policy URL.
  --support-url      Final public Support URL.
  --copyright-holder Final App Store copyright holder.
  --inputs-file      JSON file containing the same option keys without leading --.
  --mark-ready       Mark final signoff as Ready for App Review after all required evidence fields are filled.
  --dry-run          Validate inputs without writing files.

Final signoff evidence options:
  --release-commit
  --evidence-report-generated
  --app-store-connect-app-id
  --uploaded-build
  --testflight-device
  --backup-validation-file
  --backup-validation-result
  --backup-import-result
  --public-url-verification-result
  --strict-verification-result
  --accessibility-label-result
  --age-rating-result
  --signoff-owner
  --signoff-date
`);
}

const signoffInputs = [
  ["release-commit", "Release commit"],
  ["evidence-report-generated", "Evidence report generated"],
  ["app-store-connect-app-id", "App Store Connect app ID"],
  ["uploaded-build", "Uploaded build"],
  ["testflight-device", "TestFlight device"],
  ["backup-validation-file", "Backup validation file"],
  ["backup-validation-result", "Backup validation result"],
  ["backup-import-result", "Backup import result"],
  ["public-url-verification-result", "Public URL verification result"],
  ["strict-verification-result", "Strict verification result"],
  ["accessibility-label-result", "Accessibility label result"],
  ["age-rating-result", "Age rating result"],
  ["signoff-owner", "Signoff owner"],
  ["signoff-date", "Signoff date"],
];

const validKeys = new Set([
  "support-contact",
  "privacy-contact",
  "privacy-url",
  "support-url",
  "copyright-holder",
  "inputs-file",
  "dry-run",
  "mark-ready",
  ...signoffInputs.map(([key]) => key),
]);

function parseArgs() {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (!validKeys.has(key)) {
      throw new Error(`Unknown option: --${key}`);
    }

    if (key === "dry-run" || key === "mark-ready") {
      parsed[key] = true;
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function readInputsFile(path) {
  const fullPath = isAbsolute(path) ? path : join(root, path);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(fullPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read --inputs-file JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--inputs-file must contain a JSON object.");
  }

  for (const key of Object.keys(parsed)) {
    if (key === "inputs-file" || !validKeys.has(key)) {
      throw new Error(`Unknown option in --inputs-file: ${key}`);
    }
  }

  return parsed;
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function write(path, content) {
  if (dryRun) {
    return;
  }
  writeFileSync(join(root, path), content);
}

function htmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function hasConcreteContact(value) {
  return (
    /^mailto:[^"'\s>]+@[^"'\s>]+$/i.test(value) ||
    /^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value) ||
    /^tel:\+?[0-9][0-9()\-\s]+$/i.test(value) ||
    /^\+?[0-9][0-9()\-\s]{6,}$/.test(value)
  );
}

function contactHref(value) {
  if (/^mailto:/i.test(value) || /^tel:/i.test(value)) {
    return value;
  }
  if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return `mailto:${value}`;
  }
  return `tel:${value.replaceAll(/\s+/g, "")}`;
}

function requireUrl(value, label) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new Error(`${label} must use https.`);
    }
  } catch {
    throw new Error(`${label} must be a valid https URL.`);
  }
}

function requireCopyrightHolder(value) {
  if (!value || /^<.+>$/.test(value) || value.length < 2) {
    throw new Error("--copyright-holder must be a real copyright holder name.");
  }
}

function requirePattern(value, pattern, label, example) {
  if (value && !pattern.test(value)) {
    throw new Error(`${label} must look like ${example}.`);
  }
}

function requireFinalSignoffEvidence(signoffValues) {
  const validations = [
    ["Release commit", /^[0-9a-f]{7,40}$/i, "a git SHA such as abc1234"],
    ["Evidence report generated", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, "an ISO UTC timestamp such as 2026-06-25T00:00:00Z"],
    ["App Store Connect app ID", /^\d{6,12}$/, "a numeric App Store Connect app ID such as 1234567890"],
    ["Uploaded build", /^\d+\.\d+(?:\.\d+)? \(\d+\)$/, "a version/build pair such as 1.0 (1)"],
    ["Signoff date", /^\d{4}-\d{2}-\d{2}$/, "a date such as 2026-06-25"],
  ];

  for (const [label, pattern, example] of validations) {
    requirePattern(signoffValues[label], pattern, `--${signoffInputs.find(([, field]) => field === label)?.[0]}`, example);
  }
}

function replaceOrThrow(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Could not find ${label}.`);
  }
  return content.replace(search, replacement);
}

function replaceSignoffValue(content, label, value) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- ${escapedLabel}:.*$`, "m");
  if (!pattern.test(content)) {
    throw new Error(`Could not find final signoff field: ${label}.`);
  }
  return content.replace(pattern, `- ${label}: ${value}`);
}

function signoffValue(content, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = content.match(new RegExp(`^- ${escapedLabel}:[^\\S\\r\\n]*(.*)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

function missingSignoffFields(content) {
  const labels = [
    ...signoffInputs.map(([, label]) => label),
    "Final Privacy Policy URL",
    "Final Support URL",
    "Support contact",
    "Privacy contact",
    "Copyright holder",
  ];
  return labels.filter((label) => !signoffValue(content, label));
}

function updateSupportPage(contact) {
  const href = htmlEscape(contactHref(contact));
  const label = htmlEscape(contact);
  const replacement = `          Charm IDのサポート窓口は <a href="${href}">${label}</a> です。アプリの不具合、データ管理、App Store配布に関する問い合わせはこちらへご連絡ください。`;
  const paths = ["public/support.html", "docs/support.html"];

  for (const path of paths) {
    let content = read(path);

    content = replaceOrThrow(
      content,
      "          App Store公開前に、正式なサポート連絡先としてメールアドレス、電話番号、または法令上必要な連絡先をこのページに追加します。\n          TestFlightや社内検証中の問い合わせは、配布元の担当者へ連絡してください。",
      replacement,
      `${path} support contact placeholder`,
    );
    write(path, content);
  }
}

function updatePrivacyPage(contact) {
  const href = htmlEscape(contactHref(contact));
  const label = htmlEscape(contact);
  const replacement = `          本ポリシーに関する問い合わせ先は <a href="${href}">${label}</a> です。`;
  const paths = ["public/privacy.html", "docs/privacy.html"];

  for (const path of paths) {
    let content = read(path);

    content = replaceOrThrow(
      content,
      "          App Store公開前に、本ポリシーに関する具体的な連絡先としてメールアドレス、電話番号、または法令上必要な連絡先をこのページに追加します。",
      replacement,
      `${path} privacy contact placeholder`,
    );
    write(path, content);
  }
}

function updateHostingDocs(privacyUrl, supportUrl) {
  const path = "docs/github-pages-workflow.md";
  let content = read(path);
  content = content.replaceAll("https://<owner>.github.io/<repo>/privacy.html", privacyUrl);
  content = content.replaceAll("https://<owner>.github.io/<repo>/support.html", supportUrl);
  content = content.replace(/https:\/\/[^\s`]+\/privacy\.html/g, privacyUrl);
  content = content.replace(/https:\/\/[^\s`]+\/support\.html/g, supportUrl);
  write(path, content);
}

function updateFinalSignoff({ supportContact, privacyContact, privacyUrl, supportUrl, copyrightHolder, signoffValues, markReady }) {
  const path = "docs/app-review-final-signoff.md";
  let content = read(path);
  if (privacyUrl) {
    content = replaceSignoffValue(content, "Final Privacy Policy URL", privacyUrl);
  }
  if (supportUrl) {
    content = replaceSignoffValue(content, "Final Support URL", supportUrl);
  }
  if (supportContact) {
    content = replaceSignoffValue(content, "Support contact", supportContact);
  }
  if (privacyContact) {
    content = replaceSignoffValue(content, "Privacy contact", privacyContact);
  }
  if (copyrightHolder) {
    content = replaceSignoffValue(content, "Copyright holder", copyrightHolder);
  }
  for (const [label, value] of Object.entries(signoffValues)) {
    content = replaceSignoffValue(content, label, value);
  }
  if (markReady) {
    const missing = missingSignoffFields(content);
    if (missing.length > 0) {
      throw new Error(`Cannot mark ready until final signoff fields are filled: ${missing.join(", ")}.`);
    }
    content = content.replace(/^Status:.*$/m, "Status: Ready for App Review");
  }
  write(path, content);
}

const requiredFiles = [
  "public/support.html",
  "public/privacy.html",
  "docs/support.html",
  "docs/privacy.html",
  "docs/github-pages-workflow.md",
  "docs/app-review-final-signoff.md",
];

const dryRun = args.includes("--dry-run");

try {
  for (const path of requiredFiles) {
    if (!existsSync(join(root, path))) {
      throw new Error(`Missing required file: ${path}`);
    }
  }

  const cliParsed = parseArgs();
  const fileParsed = cliParsed["inputs-file"] ? readInputsFile(cliParsed["inputs-file"]) : {};
  const parsed = { ...fileParsed, ...cliParsed };
  delete parsed["inputs-file"];
  const supportContact = parsed["support-contact"];
  const privacyContact = parsed["privacy-contact"];
  const privacyUrl = parsed["privacy-url"];
  const supportUrl = parsed["support-url"];
  const copyrightHolder = parsed["copyright-holder"];
  const markReady = Boolean(parsed["mark-ready"]);
  const signoffValues = Object.fromEntries(
    signoffInputs
      .filter(([key]) => parsed[key])
      .map(([key, label]) => [label, parsed[key].trim()]),
  );

  if (!supportContact && !privacyContact && !privacyUrl && !supportUrl && !copyrightHolder && !markReady && Object.keys(signoffValues).length === 0) {
    usage();
    process.exit(1);
  }

  if (supportContact && !hasConcreteContact(supportContact)) {
    throw new Error("--support-contact must be a concrete email, mailto link, tel link, or telephone number.");
  }
  if (privacyContact && !hasConcreteContact(privacyContact)) {
    throw new Error("--privacy-contact must be a concrete email, mailto link, tel link, or telephone number.");
  }
  if (privacyUrl) {
    requireUrl(privacyUrl, "--privacy-url");
  }
  if (supportUrl) {
    requireUrl(supportUrl, "--support-url");
  }
  if (copyrightHolder) {
    requireCopyrightHolder(copyrightHolder);
  }
  requireFinalSignoffEvidence(signoffValues);
  if ((privacyUrl && !supportUrl) || (!privacyUrl && supportUrl)) {
    throw new Error("--privacy-url and --support-url must be supplied together.");
  }
  for (const [label, value] of Object.entries(signoffValues)) {
    if (!value) {
      throw new Error(`--${signoffInputs.find(([, itemLabel]) => itemLabel === label)?.[0]} must not be blank.`);
    }
  }

  if (supportContact) {
    updateSupportPage(supportContact);
  }
  if (privacyContact) {
    updatePrivacyPage(privacyContact);
  }
  if (privacyUrl && supportUrl) {
    updateHostingDocs(privacyUrl, supportUrl);
  }

  updateFinalSignoff({ supportContact, privacyContact, privacyUrl, supportUrl, copyrightHolder, signoffValues, markReady });

  console.log(dryRun ? "Release inputs validated." : "Release inputs applied.");
  console.log("Next: run npm run appstore:status and npm run appstore:audit.");
} catch (error) {
  console.error(error.message);
  console.error("");
  usage();
  process.exit(1);
}
