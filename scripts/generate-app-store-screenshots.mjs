import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = process.cwd();
const outputDir = join(root, "outputs", "app-store-screenshots");
const viewport = { width: 390, height: 844 };

const shots = [
  { file: "01-onboarding.jpg", url: "/?appshot=onboarding" },
  { file: "02-library.jpg", url: "/?appshot=library", setup: openFirstLibraryDetail },
  { file: "03-identify.jpg", url: "/?appshot=identify" },
  { file: "04-register.jpg", url: "/?appshot=register" },
];

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 4173;
      server.close(() => resolve(port));
    });
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
    child.on("error", reject);
  });
}

async function waitForPreview(baseUrl) {
  const deadline = Date.now() + 12_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Preview server is still starting.
    }
    await delay(250);
  }

  throw new Error("Vite preview did not become available.");
}

async function openFirstLibraryDetail(page) {
  await page.getByRole("button", { name: "詳細" }).first().click();
  await page.locator(".library-detail").waitFor({ timeout: 3_000 });
}

await run("npm", ["run", "build"]);
mkdirSync(outputDir, { recursive: true });

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const preview = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  },
);

let previewOutput = "";
preview.stdout.on("data", (chunk) => {
  previewOutput += chunk.toString();
});
preview.stderr.on("data", (chunk) => {
  previewOutput += chunk.toString();
});

try {
  await waitForPreview(baseUrl);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    deviceScaleFactor: 3,
    isMobile: true,
    viewport,
  });

  for (const shot of shots) {
    await page.goto(`${baseUrl}${shot.url}`, { waitUntil: "networkidle" });
    await shot.setup?.(page);
    await page.screenshot({
      fullPage: false,
      path: join(outputDir, shot.file),
      quality: 92,
      type: "jpeg",
    });
    console.log(`Generated ${shot.file}`);
  }

  await browser.close();
} catch (error) {
  console.error(previewOutput);
  throw error;
} finally {
  preview.kill("SIGTERM");
}
