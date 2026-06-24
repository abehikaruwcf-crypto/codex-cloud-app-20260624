import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = process.cwd();

const profiles = {
  "iphone-6-1": {
    label: "iPhone 6.1 inch development baseline",
    outputDir: join(root, "outputs", "app-store-screenshots"),
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    expectedScreenshotSize: { width: 1170, height: 2532 },
  },
  "iphone-6-5": {
    label: "iPhone 6.5 inch App Store fallback",
    outputDir: join(root, "outputs", "app-store-screenshots-6-5"),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 3,
    expectedScreenshotSize: { width: 1242, height: 2688 },
  },
  "iphone-6-9": {
    label: "iPhone 6.9 inch App Store primary",
    outputDir: join(root, "outputs", "app-store-screenshots-6-9"),
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
    expectedScreenshotSize: { width: 1320, height: 2868 },
  },
};

function selectedProfiles() {
  const profileArg = process.argv.find((arg) => arg.startsWith("--profile="));
  const profileValue = profileArg?.split("=")[1] ?? "iphone-6-1";

  if (profileValue === "submission") {
    return [profiles["iphone-6-9"], profiles["iphone-6-5"]];
  }

  const profile = profiles[profileValue];

  if (!profile) {
    const choices = [...Object.keys(profiles), "submission"].join(", ");
    throw new Error(`Unknown screenshot profile: ${profileValue}. Use one of: ${choices}`);
  }

  return [profile];
}

const shots = [
  { file: "01-onboarding.jpg", url: "/?appshot=onboarding" },
  { file: "02-library.jpg", url: "/?appshot=library", setup: openFirstLibraryDetail },
  { file: "03-identify.jpg", url: "/?appshot=identify" },
  { file: "04-register.jpg", url: "/?appshot=register" },
  { file: "05-learning.jpg", url: "/?appshot=identify", setup: confirmFirstCandidate },
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
  await page.getByRole("button", { name: "CH-001の詳細を開く" }).click();
  await page.locator(".library-detail").waitFor({ timeout: 3_000 });
}

async function confirmFirstCandidate(page) {
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole("button", { name: "CH-001を正解にする" }).click();
  await page.getByText("CH-001 を確定し、2枚を追加学習しました。").waitFor({ timeout: 3_000 });
}

async function waitForStableShot(page) {
  await page.locator(".app-shell").waitFor({ timeout: 5_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

function screenshotInfo(path, profile) {
  const fileOutput = execFileSync("file", [path], { encoding: "utf8" });
  const size = statSync(path).size;
  const sizePattern = `${profile.expectedScreenshotSize.width}x${profile.expectedScreenshotSize.height}`;

  return {
    ok: fileOutput.includes(sizePattern) && size > 10_000,
    detail: `${fileOutput.trim()}; ${size} bytes`,
  };
}

async function captureScreenshot(page, shot, profile) {
  const outputPath = join(profile.outputDir, shot.file);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await waitForStableShot(page);
    await page.screenshot({
      animations: "disabled",
      caret: "hide",
      clip: { x: 0, y: 0, width: profile.viewport.width, height: profile.viewport.height },
      fullPage: false,
      path: outputPath,
      quality: 92,
      type: "jpeg",
    });

    const info = screenshotInfo(outputPath, profile);

    if (info.ok) {
      console.log(`Generated ${shot.file} (${profile.expectedScreenshotSize.width}x${profile.expectedScreenshotSize.height})`);
      return;
    }

    if (attempt === 3) {
      throw new Error(`Generated ${shot.file} failed screenshot validation: ${info.detail}`);
    }

    await delay(250);
  }
}

await run("npm", ["run", "build"]);

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
  const captureProfiles = selectedProfiles();

  for (const profile of captureProfiles) {
    mkdirSync(profile.outputDir, { recursive: true });
    console.log(`Generating ${profile.label}`);

    const page = await browser.newPage({
      deviceScaleFactor: profile.deviceScaleFactor,
      isMobile: true,
      viewport: profile.viewport,
    });

    for (const shot of shots) {
      await page.goto(`${baseUrl}${shot.url}`, { waitUntil: "networkidle" });
      await shot.setup?.(page);
      await captureScreenshot(page, shot, profile);
    }

    await page.close();
  }

  await browser.close();
} catch (error) {
  console.error(previewOutput);
  throw error;
} finally {
  preview.kill("SIGTERM");
}
