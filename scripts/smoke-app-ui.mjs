import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = process.cwd();

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

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readState(page) {
  return page.evaluate(() => ({
    activeHeading: document.querySelector(".view.is-active h2")?.textContent?.trim() ?? "",
    count: document.querySelector(".count-badge")?.textContent?.trim() ?? "",
    onboardingTitle: document.querySelector(".onboarding-card h2")?.textContent?.trim() ?? null,
    libraryCards: document.querySelectorAll(".library-card").length,
    candidateCards: document.querySelectorAll(".candidate-card").length,
    completedRegisterAngles: document.querySelectorAll(".register-form .angle-card.is-complete").length,
    completedIdentifyAngles: document.querySelectorAll(".compact-capture-protocol .angle-capture.is-complete").length,
    emptyLibrary: document.querySelector(".library-empty")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    privacyLink: document.querySelector('.app-info-panel a[href="/privacy.html"]')?.textContent?.trim() ?? null,
    infoPanel: document.querySelector(".app-info-panel")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    topCandidate: document.querySelector(".match-summary h3")?.textContent?.trim() ?? null,
    qualityText: document.querySelector(".training-meter strong")?.textContent?.trim() ?? null,
  }));
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });

  await page.goto(`${baseUrl}/?smoke=fresh`);
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  const fresh = await readState(page);
  expect(fresh.count === "0件", "Fresh first launch should not preload demo data.");
  expect(fresh.onboardingTitle === "6方向登録と追加学習", "Fresh first launch should show onboarding.");
  expect(fresh.emptyLibrary?.includes("登録データがありません"), "Fresh empty library state should be present.");

  await page.goto(`${baseUrl}/?appshot=library`);
  const library = await readState(page);
  expect(library.count === "2件", "Library appshot should load two demo models.");
  expect(library.activeHeading === "登録一覧", "Library appshot should open the library view.");
  expect(library.libraryCards === 2, "Library appshot should render two library cards.");
  expect(library.privacyLink === "プライバシーポリシー", "Library should expose the privacy policy link.");
  expect(library.infoPanel?.includes("端末内に保存"), "Library should explain local-only storage.");

  await page.goto(`${baseUrl}/?appshot=identify`);
  const identify = await readState(page);
  expect(identify.activeHeading === "撮影して識別", "Identify appshot should open the identify view.");
  expect(identify.completedIdentifyAngles === 2, "Identify appshot should include two query angles.");
  expect(identify.candidateCards >= 2, "Identify appshot should render ranked candidates.");
  expect(identify.topCandidate === "CH-001", "Identify appshot should rank CH-001 first.");

  await page.goto(`${baseUrl}/?appshot=register`);
  const register = await readState(page);
  expect(register.activeHeading === "チャーム登録", "Register appshot should open the register view.");
  expect(register.completedRegisterAngles === 6, "Register appshot should include six completed angles.");
  expect(register.qualityText === "96%", "Register appshot should show complete six-angle quality.");

  await browser.close();
  console.log("UI smoke test passed.");
} catch (error) {
  console.error(previewOutput);
  throw error;
} finally {
  preview.kill("SIGTERM");
}
