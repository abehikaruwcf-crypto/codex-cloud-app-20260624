import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
  --dry-run          Validate inputs without writing files.
`);
}

function parseArgs() {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    if (key === "dry-run") {
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

function replaceOrThrow(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Could not find ${label}.`);
  }
  return content.replace(search, replacement);
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

function updateFinalSignoff({ supportContact, privacyContact, privacyUrl, supportUrl }) {
  const path = "docs/app-review-final-signoff.md";
  let content = read(path);
  if (privacyUrl) {
    content = content.replace(/- Final Privacy Policy URL:.*$/m, `- Final Privacy Policy URL: ${privacyUrl}`);
  }
  if (supportUrl) {
    content = content.replace(/- Final Support URL:.*$/m, `- Final Support URL: ${supportUrl}`);
  }
  if (supportContact) {
    content = content.replace(/- Support contact:.*$/m, `- Support contact: ${supportContact}`);
  }
  if (privacyContact) {
    content = content.replace(/- Privacy contact:.*$/m, `- Privacy contact: ${privacyContact}`);
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

  const parsed = parseArgs();
  const supportContact = parsed["support-contact"];
  const privacyContact = parsed["privacy-contact"];
  const privacyUrl = parsed["privacy-url"];
  const supportUrl = parsed["support-url"];

  if (!supportContact && !privacyContact && !privacyUrl && !supportUrl) {
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
  if ((privacyUrl && !supportUrl) || (!privacyUrl && supportUrl)) {
    throw new Error("--privacy-url and --support-url must be supplied together.");
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

  updateFinalSignoff({ supportContact, privacyContact, privacyUrl, supportUrl });

  console.log(dryRun ? "Release inputs validated." : "Release inputs applied.");
  console.log("Next: run npm run appstore:status and npm run appstore:audit.");
} catch (error) {
  console.error(error.message);
  console.error("");
  usage();
  process.exit(1);
}
