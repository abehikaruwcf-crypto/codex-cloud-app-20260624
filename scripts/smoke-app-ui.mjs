import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const root = process.cwd();
const packageVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

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

function backupImage(angleLabel) {
  return {
    id: `backup-${angleLabel}`,
    imageUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E",
    angleLabel,
    signature: { red: 0, green: 0, blue: 0, brightness: 0 },
    source: "registration",
    createdAt: "2026-06-25T00:00:00.000Z",
  };
}

function backupCharm(id, managementNumber) {
  return {
    id,
    managementNumber,
    note: "",
    createdAt: "2026-06-25T00:00:00.000Z",
    images: ["表", "裏", "右側面", "左側面", "上側面", "下側面"].map(backupImage),
  };
}

async function readState(page) {
  return page.evaluate(() => ({
    activeHeading: document.querySelector(".view.is-active h2")?.textContent?.trim() ?? "",
    count: document.querySelector(".count-badge")?.textContent?.trim() ?? "",
    onboardingTitle: document.querySelector(".onboarding-card h2")?.textContent?.trim() ?? null,
    libraryCards: document.querySelectorAll(".library-card").length,
    libraryCardTitles: [...document.querySelectorAll(".library-card h3")].map((heading) => heading.textContent?.trim()),
    libraryEmptyText: document.querySelector(".library-empty")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    libraryDetailText: document.querySelector(".library-detail")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    libraryDetailImages: document.querySelectorAll(".library-angle-grid img").length,
    candidateCards: document.querySelectorAll(".candidate-card").length,
    completedRegisterAngles: document.querySelectorAll(".register-form .angle-card.is-complete").length,
    completedIdentifyAngles: document.querySelectorAll(".compact-capture-protocol .angle-capture.is-complete").length,
    emptyLibrary: document.querySelector(".library-empty")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    privacyLink: document.querySelector('.app-info-panel a[href="/privacy.html"]')?.textContent?.trim() ?? null,
    supportLink: document.querySelector('.app-info-panel a[href="/support.html"]')?.textContent?.trim() ?? null,
    infoPanel: document.querySelector(".app-info-panel")?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    statusRole: document.querySelector(".status-message")?.getAttribute("role") ?? null,
    statusText: document.querySelector(".status-message")?.textContent?.trim() ?? null,
    librarySortValue: document.querySelector(".library-sort select")?.value ?? null,
    identifyFileLabels: [...document.querySelectorAll('.view.is-active input[type="file"]')]
      .map((input) => input.getAttribute("aria-label"))
      .filter(Boolean),
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

  await page.goto(`${baseUrl}/?smokeError=1`);
  const errorState = await page.evaluate(() => ({
    alertText: document.querySelector('[role="alert"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
    buttons: [...document.querySelectorAll(".error-panel button")].map((button) => button.textContent?.trim()),
  }));
  expect(errorState.alertText.includes("起動に失敗しました"), "Error boundary should show a recoverable startup failure.");
  expect(errorState.buttons.includes("再読み込み"), "Error boundary should offer reload.");
  expect(errorState.buttons.includes("端末内データを初期化"), "Error boundary should offer local data reset.");

  await page.goto(`${baseUrl}/?appshot=library`);
  const library = await readState(page);
  expect(library.count === "2件", "Library appshot should load two demo models.");
  expect(library.activeHeading === "登録一覧", "Library appshot should open the library view.");
  expect(library.libraryCards === 2, "Library appshot should render two library cards.");
  expect(library.privacyLink === "プライバシーポリシー", "Library should expose the privacy policy link.");
  expect(library.supportLink === "サポート", "Library should expose the support page link.");
  expect(library.infoPanel?.includes("端末内に保存"), "Library should explain local-only storage.");
  expect(library.infoPanel?.includes(`Version ${packageVersion}`), "Library should show the package version.");
  await page.getByRole("button", { name: "詳細" }).first().click();
  const detailedLibrary = await readState(page);
  expect(detailedLibrary.libraryDetailImages === 6, "Library detail should render six angle images.");
  expect(detailedLibrary.libraryDetailText?.includes("登録日"), "Library detail should show registration metadata.");
  expect(detailedLibrary.libraryDetailText?.includes("追加学習"), "Library detail should show learned image metadata.");
  page.once("dialog", async (dialog) => {
    expect(dialog.type() === "prompt", "Library deletion should require typed management number confirmation.");
    await dialog.accept("WRONG");
  });
  await page.getByRole("button", { name: "削除" }).first().click();
  await page.getByText("管理番号が一致しないため削除を中止しました。").waitFor({ timeout: 3000 });
  const cancelledDeletionLibrary = await readState(page);
  expect(cancelledDeletionLibrary.libraryCards === 2, "Wrong deletion confirmation should keep the model.");
  await page.getByPlaceholder("例: CH-001").fill("ch-002");
  const searchedLibrary = await readState(page);
  expect(searchedLibrary.libraryCards === 1, "Library search should filter to one model.");
  expect(searchedLibrary.libraryCardTitles.includes("CH-002"), "Library search should match management numbers case-insensitively.");
  await page.getByPlaceholder("例: CH-001").fill("missing");
  const emptySearchLibrary = await readState(page);
  expect(emptySearchLibrary.libraryCards === 0, "Library search should hide non-matching models.");
  expect(emptySearchLibrary.libraryEmptyText?.includes("一致する登録がありません"), "Library search should show a no-results state.");
  await page.getByRole("button", { name: "検索をクリア" }).click();
  const clearedSearchLibrary = await readState(page);
  expect(clearedSearchLibrary.libraryCards === 2, "Library search clear should restore the full list.");
  expect(clearedSearchLibrary.librarySortValue === "recent", "Library should default to registration order.");
  await page.getByLabel("並び替え").selectOption("managementDesc");
  const descendingLibrary = await readState(page);
  expect(
    descendingLibrary.libraryCardTitles.join(",") === "CH-002,CH-001",
    "Library management number descending sort should reorder the list.",
  );
  await page.getByLabel("並び替え").selectOption("managementAsc");
  const ascendingLibrary = await readState(page);
  expect(
    ascendingLibrary.libraryCardTitles.join(",") === "CH-001,CH-002",
    "Library management number ascending sort should reorder the list.",
  );
  const duplicateBackupPath = join(tmpdir(), `charm-id-duplicate-backup-${Date.now()}.json`);
  writeFileSync(
    duplicateBackupPath,
    JSON.stringify({
      version: 1,
      exportedAt: "2026-06-25T00:00:00.000Z",
      charms: [backupCharm("duplicate-1", "CH-900"), backupCharm("duplicate-2", "ch-900")],
      decisionLogs: [],
    }),
  );
  await page.locator('input[accept="application/json,.json"]').setInputFiles(duplicateBackupPath);
  await page.getByText("バックアップに重複した管理番号があります: CH-900").waitFor({ timeout: 3000 });
  page.once("dialog", async (dialog) => {
    expect(dialog.type() === "prompt", "Local reset should require typed RESET confirmation.");
    await dialog.accept("NO");
  });
  await page.getByRole("button", { name: "端末内データをリセット" }).click();
  await page.getByText("RESET が入力されなかったため、端末内データのリセットを中止しました。").waitFor({
    timeout: 3000,
  });
  const cancelledResetLibrary = await readState(page);
  expect(cancelledResetLibrary.libraryCards === 2, "Wrong reset confirmation should keep local models.");
  page.once("dialog", async (dialog) => {
    await dialog.accept("CH-001");
  });
  await page.getByRole("button", { name: "削除" }).first().click();
  await page.getByText("CH-001 を削除しました。").waitFor({ timeout: 3000 });
  const deletedLibrary = await readState(page);
  expect(deletedLibrary.libraryCards === 1, "Matching deletion confirmation should remove one model.");
  page.once("dialog", async (dialog) => {
    await dialog.accept("RESET");
  });
  await page.getByRole("button", { name: "端末内データをリセット" }).click();
  await page.getByText("端末内データをリセットしました。").waitFor({ timeout: 3000 });
  const resetLibrary = await readState(page);
  expect(resetLibrary.libraryCards === 0, "Matching reset confirmation should clear local models.");

  await page.goto(`${baseUrl}/?appshot=identify`);
  const identify = await readState(page);
  expect(identify.activeHeading === "撮影して識別", "Identify appshot should open the identify view.");
  expect(identify.completedIdentifyAngles === 2, "Identify appshot should include two query angles.");
  expect(identify.candidateCards >= 2, "Identify appshot should render ranked candidates.");
  expect(identify.topCandidate === "CH-001", "Identify appshot should rank CH-001 first.");
  expect(
    identify.identifyFileLabels.includes("表の識別写真を撮影"),
    "Identify file inputs should expose accessible labels.",
  );

  await page.goto(`${baseUrl}/?appshot=register`);
  const register = await readState(page);
  expect(register.activeHeading === "チャーム登録", "Register appshot should open the register view.");
  expect(register.completedRegisterAngles === 6, "Register appshot should include six completed angles.");
  expect(register.qualityText === "96%", "Register appshot should show complete six-angle quality.");
  expect(
    register.identifyFileLabels.includes("表の登録写真を撮影"),
    "Register file inputs should expose accessible labels.",
  );
  await page.getByPlaceholder("例: CH-1042").fill(" ch-001 ");
  await page.getByRole("button", { name: "登録する" }).click();
  const duplicateRegister = await readState(page);
  expect(
    duplicateRegister.statusText === "CH-001 は登録済みです。既存モデルに追加学習してください。",
    "Register should block duplicate management numbers.",
  );
  expect(duplicateRegister.activeHeading === "チャーム登録", "Duplicate registration should keep the register view active.");

  await browser.close();
  console.log("UI smoke test passed.");
} catch (error) {
  console.error(previewOutput);
  throw error;
} finally {
  preview.kill("SIGTERM");
}
