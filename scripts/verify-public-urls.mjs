import { readFileSync } from "node:fs";
import { request } from "node:https";
import { join } from "node:path";

const root = process.cwd();
const notesPath = "docs/github-pages-workflow.md";
const notes = readFileSync(join(root, notesPath), "utf8");

function uniqueMatches(content, pattern) {
  return [...new Set([...content.matchAll(pattern)].map((match) => match[0]))];
}

function findRequiredUrl(kind) {
  const urls = uniqueMatches(notes, /https:\/\/[^\s`)]+\/(?:privacy|support)\.html/g);
  const match = urls.find((url) => url.endsWith(`/${kind}.html`));

  if (!match) {
    throw new Error(`Missing public ${kind}.html URL in ${notesPath}`);
  }

  return match;
}

function fetchUrl(url, method = "HEAD") {
  return new Promise((resolve, reject) => {
    const req = request(url, { method, timeout: 15_000 }, (response) => {
      const chunks = [];

      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });

    req.on("timeout", () => req.destroy(new Error(`Timed out while checking ${url}`)));
    req.on("error", reject);
    req.end();
  });
}

async function checkPublicPage({ label, url, requiredTitle }) {
  const head = await fetchUrl(url, "HEAD");

  if (head.statusCode < 200 || head.statusCode >= 400) {
    throw new Error(`${label} returned HTTP ${head.statusCode}: ${url}`);
  }

  const get = await fetchUrl(url, "GET");

  if (get.statusCode < 200 || get.statusCode >= 400) {
    throw new Error(`${label} GET returned HTTP ${get.statusCode}: ${url}`);
  }

  if (!get.body.includes(requiredTitle)) {
    throw new Error(`${label} did not include expected title "${requiredTitle}": ${url}`);
  }

  const contentType = String(get.headers["content-type"] ?? "");
  console.log(`[PASS] ${label}: ${url} (${get.statusCode}, ${contentType || "unknown content-type"})`);
}

const privacyUrl = findRequiredUrl("privacy");
const supportUrl = findRequiredUrl("support");

await checkPublicPage({
  label: "Privacy Policy URL",
  requiredTitle: "Charm ID Privacy Policy",
  url: privacyUrl,
});
await checkPublicPage({
  label: "Support URL",
  requiredTitle: "Charm ID Support",
  url: supportUrl,
});

console.log("Public App Store URLs are reachable.");
