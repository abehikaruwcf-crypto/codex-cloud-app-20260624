import React, { ChangeEvent, Component, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import packageJson from "../package.json";
import {
  angleSuggestions,
  BackupPayload,
  Candidate,
  captureAngles,
  Charm,
  CharmImage,
  DecisionLog,
  ImageSignature,
  View,
} from "./domain";
import { colorSignatureEngine } from "./matchingEngine";
import "./styles.css";

const STORAGE_KEY = "charm-id-camera-app-charms";
const DECISION_STORAGE_KEY = "charm-id-camera-app-decisions";
const ONBOARDING_STORAGE_KEY = "charm-id-camera-app-onboarding-dismissed";
const MAX_IMAGES_PER_ANGLE = 8;
const APP_VERSION = packageJson.version;
const CAMERA_PERMISSION_HELP =
  "カメラが開かない場合は、iPhoneの設定アプリで Charm ID > カメラ を許可し、この画面に戻って撮り直してください。写真ライブラリから選べる場合は、既存写真でも登録・識別できます。";

type AppShotMode = "onboarding" | "register" | "identify" | "library";
type LibrarySort = "recent" | "managementAsc" | "managementDesc";

type ErrorBoundaryState = {
  hasError: boolean;
};

const angleSignatureOffsets: Record<string, Partial<ImageSignature>> = {
  表: { brightness: 0 },
  裏: { brightness: -12 },
  右側面: { red: -10, green: -8, blue: -6, brightness: -18 },
  左側面: { red: -7, green: -6, blue: -4, brightness: -15 },
  上側面: { red: 8, green: 8, blue: 6, brightness: 12 },
  下側面: { red: -14, green: -12, blue: -10, brightness: -22 },
};

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function signatureWithOffset(base: ImageSignature, angleLabel: string): ImageSignature {
  const offset = angleSignatureOffsets[angleLabel] ?? {};

  return {
    red: clampChannel(base.red + (offset.red ?? 0)),
    green: clampChannel(base.green + (offset.green ?? 0)),
    blue: clampChannel(base.blue + (offset.blue ?? 0)),
    brightness: clampChannel(base.brightness + (offset.brightness ?? 0)),
  };
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function demoCharmImage(
  charmId: string,
  angleLabel: string,
  palette: { background: string; fill: string; accent: string; shape: "circle" | "diamond" },
  baseSignature: ImageSignature,
): CharmImage {
  const sideScale = angleLabel.includes("側面") ? 0.58 : 1;
  const shape =
    palette.shape === "circle"
      ? `<ellipse cx="240" cy="238" rx="${112 * sideScale}" ry="126" fill="${palette.fill}"/>`
      : `<path d="M240 98 L362 240 L240 382 L118 240Z" transform="scale(${sideScale} 1) translate(${(1 - sideScale) * 240} 0)" fill="${palette.fill}"/>`;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480">
      <rect width="480" height="480" rx="40" fill="${palette.background}"/>
      <circle cx="240" cy="92" r="34" fill="${palette.accent}"/>
      <circle cx="240" cy="92" r="16" fill="#ffffff"/>
      ${shape}
      <circle cx="240" cy="240" r="48" fill="#ffffff" opacity="0.92"/>
      <text x="240" y="420" text-anchor="middle" font-family="Arial" font-size="34" font-weight="700" fill="#172026">${angleLabel}</text>
    </svg>
  `;

  return {
    id: `${charmId}-${angleLabel}`,
    imageUrl: svgDataUrl(svg),
    angleLabel,
    signature: signatureWithOffset(baseSignature, angleLabel),
    source: "registration",
    createdAt: new Date().toISOString(),
  };
}

function createDemoCharm(
  id: string,
  managementNumber: string,
  note: string,
  palette: { background: string; fill: string; accent: string; shape: "circle" | "diamond" },
  baseSignature: ImageSignature,
): Charm {
  return {
    id,
    managementNumber,
    note,
    createdAt: new Date().toISOString(),
    images: captureAngles.map((angle) => demoCharmImage(id, angle.label, palette, baseSignature)),
  };
}

const sampleCharms: Charm[] = [
  createDemoCharm(
    "sample-1",
    "CH-001",
    "デモ: ゴールドリング型",
    { background: "#f7efe0", fill: "#d4a944", accent: "#b9912f", shape: "circle" },
    { red: 212, green: 169, blue: 68, brightness: 150 },
  ),
  createDemoCharm(
    "sample-2",
    "CH-002",
    "デモ: シルバーダイヤ型",
    { background: "#edf1f4", fill: "#a6b1ba", accent: "#77858f", shape: "diamond" },
    { red: 166, green: 177, blue: 186, brightness: 176 },
  ),
];

function appShotMode(): AppShotMode | null {
  const mode = new URLSearchParams(window.location.search).get("appshot");

  if (mode === "onboarding" || mode === "register" || mode === "identify" || mode === "library") {
    return mode;
  }

  return null;
}

function shouldShowSmokeError() {
  return new URLSearchParams(window.location.search).get("smokeError") === "1";
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Charm ID render error", error);
  }

  resetLocalDataAndReload() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DECISION_STORAGE_KEY);
    window.location.href = window.location.pathname;
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="app-shell">
        <section className="error-panel" role="alert">
          <p className="eyebrow">Charm ID</p>
          <h1>起動に失敗しました</h1>
          <p>
            一時的な読み込みエラー、または端末内データの破損が原因の可能性があります。
            まずアプリを再起動し、改善しない場合は端末内データを初期化してください。
          </p>
          <div>
            <button type="button" onClick={() => window.location.reload()}>
              再読み込み
            </button>
            <button type="button" onClick={() => this.resetLocalDataAndReload()}>
              端末内データを初期化
            </button>
          </div>
        </section>
      </main>
    );
  }
}

function demoDecisionLogs(): DecisionLog[] {
  return [
    {
      id: "demo-decision-1",
      managementNumber: "CH-001",
      decision: "confirmed",
      score: 91,
      learnedImages: 2,
      createdAt: new Date().toISOString(),
    },
  ];
}

function demoQueryImages(): CharmImage[] {
  return sampleCharms[0].images
    .filter((image) => image.angleLabel === "表" || image.angleLabel === "裏")
    .map((image) => ({
      ...image,
      id: `query-${image.id}`,
      source: "confirmed-identification",
      createdAt: new Date().toISOString(),
    }));
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeManagementNumber(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function signatureFromImage(imageUrl: string): Promise<ImageSignature> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return { red: 0, green: 0, blue: 0, brightness: 0 };
  }

  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let counted = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    red += pixels[index] * alpha;
    green += pixels[index + 1] * alpha;
    blue += pixels[index + 2] * alpha;
    counted += alpha;
  }

  const safeCount = Math.max(counted, 1);
  const averageRed = red / safeCount;
  const averageGreen = green / safeCount;
  const averageBlue = blue / safeCount;

  return {
    red: Math.round(averageRed),
    green: Math.round(averageGreen),
    blue: Math.round(averageBlue),
    brightness: Math.round((averageRed + averageGreen + averageBlue) / 3),
  };
}

function confidenceLabel(score: number) {
  if (score >= 88) {
    return "高";
  }

  if (score >= 74) {
    return "中";
  }

  return "要確認";
}

function qualityScore(images: CharmImage[]) {
  const requiredAngleCount = captureAngles.filter((angle) =>
    images.some((image) => image.angleLabel === angle.label),
  ).length;
  const angleScore = requiredAngleCount * 16;
  const bonusScore = Math.min(images.length - requiredAngleCount, 2) * 2;

  return Math.max(0, Math.min(100, angleScore + bonusScore));
}

function learningImageCount(charm: Charm) {
  return charm.images.filter((image) => image.source === "confirmed-identification").length;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "日時不明";
  }

  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function missingAngles(images: CharmImage[]) {
  return captureAngles.filter((angle) => !images.some((image) => image.angleLabel === angle.label));
}

function loadDecisions() {
  const stored = localStorage.getItem(DECISION_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    return (JSON.parse(stored) as DecisionLog[]).map((log) => ({
      ...log,
      learnedImages: log.learnedImages ?? 0,
    }));
  } catch {
    return [];
  }
}

function normalizeDecisionLog(value: unknown): DecisionLog | null {
  if (!isRecord(value)) {
    return null;
  }

  const decision = value.decision === "rejected" ? "rejected" : "confirmed";

  return {
    id: typeof value.id === "string" ? value.id : makeId("decision"),
    managementNumber:
      typeof value.managementNumber === "string" ? value.managementNumber : "UNKNOWN",
    decision,
    score: typeof value.score === "number" ? value.score : 0,
    learnedImages: typeof value.learnedImages === "number" ? value.learnedImages : 0,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeCharmImage(value: unknown): CharmImage | null {
  if (!isRecord(value)) {
    return null;
  }

  const signature = isRecord(value.signature) ? value.signature : {};
  const source =
    value.source === "confirmed-identification" ? "confirmed-identification" : "registration";

  return {
    id: typeof value.id === "string" ? value.id : makeId("image"),
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "",
    angleLabel: typeof value.angleLabel === "string" ? value.angleLabel : captureAngles[0].label,
    signature: {
      red: typeof signature.red === "number" ? signature.red : 0,
      green: typeof signature.green === "number" ? signature.green : 0,
      blue: typeof signature.blue === "number" ? signature.blue : 0,
      brightness: typeof signature.brightness === "number" ? signature.brightness : 0,
    },
    source,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeCharm(value: unknown): Charm | null {
  if (!isRecord(value)) {
    return null;
  }

  const images = Array.isArray(value.images)
    ? value.images.map(normalizeCharmImage).filter((image): image is CharmImage => Boolean(image))
    : [];

  if (images.length === 0) {
    return null;
  }

  const managementNumber =
    typeof value.managementNumber === "string"
      ? normalizeManagementNumber(value.managementNumber)
      : "";

  if (!managementNumber) {
    return null;
  }

  return {
    id: typeof value.id === "string" ? value.id : makeId("charm"),
    managementNumber,
    note: typeof value.note === "string" ? value.note : "",
    images,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
  };
}

function normalizeBackupPayload(value: unknown): BackupPayload | null {
  if (!isRecord(value) || !Array.isArray(value.charms)) {
    return null;
  }

  const charms = value.charms
    .map(normalizeCharm)
    .filter((charm): charm is Charm => Boolean(charm));

  if (charms.length === 0) {
    return null;
  }

  const decisionLogs = Array.isArray(value.decisionLogs)
    ? value.decisionLogs
        .map(normalizeDecisionLog)
        .filter((log): log is DecisionLog => Boolean(log))
    : [];

  return {
    charms,
    decisionLogs,
    exportedAt:
      typeof value.exportedAt === "string" ? value.exportedAt : new Date().toISOString(),
    version: 1,
  };
}

function validateBackupPayload(value: unknown, backup: BackupPayload) {
  if (isRecord(value) && typeof value.version === "number" && value.version > 1) {
    return `未対応のバックアップ形式です。version ${value.version} は読み込めません。`;
  }

  const seenManagementNumbers = new Set<string>();

  for (const charm of backup.charms) {
    const normalizedManagementNumber = normalizeManagementNumber(charm.managementNumber);

    if (seenManagementNumbers.has(normalizedManagementNumber)) {
      return `バックアップに重複した管理番号があります: ${normalizedManagementNumber}`;
    }

    seenManagementNumbers.add(normalizedManagementNumber);

    const missingRequiredAngles = missingAngles(charm.images);

    if (missingRequiredAngles.length > 0) {
      return `${normalizedManagementNumber} の6方向写真が不足しています: ${missingRequiredAngles
        .map((angle) => angle.label)
        .join(" / ")}`;
    }
  }

  return null;
}

function loadCharms() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    return (JSON.parse(stored) as Charm[]).map((charm) => ({
      ...charm,
      images: charm.images.map((image) => ({
        ...image,
        source: image.source ?? "registration",
      })),
    }));
  } catch {
    return [];
  }
}

function onboardingDismissed() {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

function CameraPermissionHelp() {
  return <p className="permission-note">{CAMERA_PERMISSION_HELP}</p>;
}

function App() {
  if (shouldShowSmokeError()) {
    throw new Error("Smoke test error boundary check");
  }

  const shotMode = appShotMode();
  const [activeView, setActiveView] = useState<View>(
    shotMode === "register" ? "register" : shotMode === "library" ? "library" : "identify",
  );
  const [charms, setCharms] = useState<Charm[]>(
    shotMode && shotMode !== "onboarding" ? sampleCharms : loadCharms,
  );
  const [managementNumber, setManagementNumber] = useState("");
  const [note, setNote] = useState("");
  const [draftImages, setDraftImages] = useState<CharmImage[]>(
    shotMode === "register" ? sampleCharms[0].images : [],
  );
  const [queryImages, setQueryImages] = useState<CharmImage[]>(
    shotMode === "identify" ? demoQueryImages() : [],
  );
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>(
    shotMode ? demoDecisionLogs() : loadDecisions,
  );
  const [correctionTargetId, setCorrectionTargetId] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(
    shotMode === "onboarding" ? true : shotMode ? false : !onboardingDismissed(),
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [librarySort, setLibrarySort] = useState<LibrarySort>("recent");
  const [selectedLibraryCharmId, setSelectedLibraryCharmId] = useState("");

  useEffect(() => {
    if (shotMode) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(charms));
  }, [charms, shotMode]);

  useEffect(() => {
    if (shotMode) {
      return;
    }

    localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(decisionLogs));
  }, [decisionLogs, shotMode]);

  const candidates = useMemo(() => {
    if (queryImages.length === 0) {
      return [];
    }

    return colorSignatureEngine.findCandidates(queryImages, charms);
  }, [charms, queryImages]);

  const topCandidate = candidates[0];
  const currentQualityScore = qualityScore(draftImages);
  const missingDraftAngles = missingAngles(draftImages);
  const missingQueryAngles = missingAngles(queryImages);
  const selectedCorrectionTarget = charms.find((charm) => charm.id === correctionTargetId);
  const selectedLibraryCharm = charms.find((charm) => charm.id === selectedLibraryCharmId);
  const normalizedLibrarySearch = normalizeManagementNumber(librarySearch);
  const filteredCharms = useMemo(() => {
    const matchingCharms = normalizedLibrarySearch
      ? charms.filter((charm) => {
          const searchableText = normalizeManagementNumber(`${charm.managementNumber} ${charm.note}`);
          return searchableText.includes(normalizedLibrarySearch);
        })
      : charms;

    if (librarySort === "recent") {
      return matchingCharms;
    }

    return [...matchingCharms].sort((firstCharm, secondCharm) => {
      const firstManagementNumber = normalizeManagementNumber(firstCharm.managementNumber);
      const secondManagementNumber = normalizeManagementNumber(secondCharm.managementNumber);
      const comparison = firstManagementNumber.localeCompare(secondManagementNumber, "ja-JP", {
        numeric: true,
        sensitivity: "base",
      });

      return librarySort === "managementAsc" ? comparison : -comparison;
    });
  }, [charms, librarySort, normalizedLibrarySearch]);

  async function addImages(event: ChangeEvent<HTMLInputElement>, angleLabel: string) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      const nextImages = await Promise.all(
        files.map(async (file, index) => {
          const imageUrl = await fileToDataUrl(file);
          const signature = await signatureFromImage(imageUrl);

          return {
            id: makeId("image"),
            imageUrl,
            signature,
            angleLabel,
            source: "registration" as const,
            createdAt: new Date().toISOString(),
          };
        }),
      );

      setDraftImages((current) => [
        ...current.filter((image) => image.angleLabel !== angleLabel),
        ...nextImages.slice(0, 1),
      ]);
    } catch {
      setMessage("画像を読み込めませんでした。別の写真でもう一度試してください。");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  async function identifyImage(event: ChangeEvent<HTMLInputElement>, angleLabel: string) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      const imageUrl = await fileToDataUrl(file);
      const signature = await signatureFromImage(imageUrl);
      const nextImage = {
        id: makeId("query"),
        imageUrl,
        signature,
        angleLabel,
        source: "confirmed-identification" as const,
        createdAt: new Date().toISOString(),
      };
      setQueryImages((current) => [
        ...current.filter((image) => image.angleLabel !== angleLabel),
        nextImage,
      ]);
      setActiveView("identify");
    } catch {
      setMessage("識別用の画像を読み込めませんでした。");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  function saveCharm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedManagementNumber = normalizeManagementNumber(managementNumber);

    if (!normalizedManagementNumber) {
      setMessage("管理番号を入力してください。");
      return;
    }

    const alreadyRegistered = charms.some(
      (charm) => normalizeManagementNumber(charm.managementNumber) === normalizedManagementNumber,
    );

    if (alreadyRegistered) {
      setMessage(`${normalizedManagementNumber} は登録済みです。既存モデルに追加学習してください。`);
      return;
    }

    if (missingDraftAngles.length > 0) {
      setMessage(
        `6方向撮影が未完了です: ${missingDraftAngles.map((angle) => angle.label).join(" / ")}`,
      );
      return;
    }

    const now = new Date().toISOString();
    const charm: Charm = {
      id: makeId("charm"),
      managementNumber: normalizedManagementNumber,
      note: note.trim(),
      images: draftImages,
      createdAt: now,
    };

    setCharms((current) => [charm, ...current]);
    setManagementNumber("");
    setNote("");
    setDraftImages([]);
    setMessage(`${charm.managementNumber} を登録しました。`);
    setActiveView("library");
  }

  function removeDraftImage(imageId: string) {
    setDraftImages((current) => current.filter((image) => image.id !== imageId));
  }

  function updateDraftAngle(imageId: string, angleLabel: string) {
    setDraftImages((current) =>
      current.map((image) => (image.id === imageId ? { ...image, angleLabel } : image)),
    );
  }

  function deleteCharm(charmId: string) {
    const targetCharm = charms.find((charm) => charm.id === charmId);

    if (!targetCharm) {
      setMessage("削除対象の登録データが見つかりませんでした。");
      return;
    }

    const typedManagementNumber = window.prompt(
      `${targetCharm.managementNumber} を削除します。元に戻せません。削除する管理番号を入力してください。`,
    );

    if (
      normalizeManagementNumber(typedManagementNumber ?? "") !==
      normalizeManagementNumber(targetCharm.managementNumber)
    ) {
      setMessage("管理番号が一致しないため削除を中止しました。");
      return;
    }

    setCharms((current) => current.filter((charm) => charm.id !== charmId));
    setSelectedLibraryCharmId((current) => (current === charmId ? "" : current));
    setMessage(`${targetCharm.managementNumber} を削除しました。`);
  }

  function clearQueryImages() {
    setQueryImages([]);
    setMessage("識別用の撮影をリセットしました。");
  }

  function imagesForLearning(sourceImages: CharmImage[]) {
    return sourceImages.map((image) => ({
      ...image,
      id: makeId("learned"),
      source: "confirmed-identification" as const,
      createdAt: new Date().toISOString(),
    }));
  }

  function mergeLearningImages(charm: Charm, learnedImages: CharmImage[]) {
    const nextImages = [...charm.images, ...learnedImages];

    return {
      ...charm,
      images: angleSuggestions.flatMap((angleLabel) =>
        nextImages
          .filter((image) => image.angleLabel === angleLabel)
          .slice(-MAX_IMAGES_PER_ANGLE),
      ),
    };
  }

  function logDecision(candidate: Candidate, decision: DecisionLog["decision"], learnedImages = 0) {
    const nextLog: DecisionLog = {
      id: makeId("decision"),
      managementNumber: candidate.charm.managementNumber,
      decision,
      score: candidate.score,
      learnedImages,
      createdAt: new Date().toISOString(),
    };

    setDecisionLogs((current) => [nextLog, ...current].slice(0, 20));
    setMessage(
      decision === "confirmed"
        ? `${candidate.charm.managementNumber} を確定しました。`
        : `${candidate.charm.managementNumber} を違う候補として記録しました。`,
    );
  }

  function confirmCandidate(candidate: Candidate) {
    const confirmed = window.confirm(
      `${candidate.charm.managementNumber} を正解として、今回の撮影画像を追加学習しますか？`,
    );

    if (!confirmed) {
      setMessage("追加学習を中止しました。管理番号を確認してから確定してください。");
      return;
    }

    const learnedImages = imagesForLearning(queryImages);

    setCharms((current) =>
      current.map((charm) =>
        charm.id === candidate.charm.id ? mergeLearningImages(charm, learnedImages) : charm,
      ),
    );
    logDecision(candidate, "confirmed", learnedImages.length);
    setMessage(
      `${candidate.charm.managementNumber} を確定し、${learnedImages.length}枚を追加学習しました。`,
    );
  }

  function applyCorrection() {
    if (!selectedCorrectionTarget || !topCandidate) {
      setMessage("正しい管理番号を選択してください。");
      return;
    }

    const confirmed = window.confirm(
      `${selectedCorrectionTarget.managementNumber} を正解として、今回の撮影画像を追加学習しますか？`,
    );

    if (!confirmed) {
      setMessage("追加学習を中止しました。管理番号を確認してから確定してください。");
      return;
    }

    const learnedImages = imagesForLearning(queryImages);

    setCharms((current) =>
      current.map((charm) =>
        charm.id === selectedCorrectionTarget.id ? mergeLearningImages(charm, learnedImages) : charm,
      ),
    );
    logDecision(
      { ...topCandidate, charm: selectedCorrectionTarget },
      "confirmed",
      learnedImages.length,
    );
    setCorrectionTargetId("");
    setMessage(
      `${selectedCorrectionTarget.managementNumber} を正解として、${learnedImages.length}枚を追加学習しました。`,
    );
  }

  function exportDataset() {
    const payload = JSON.stringify(
      { charms, decisionLogs, exportedAt: new Date().toISOString(), version: 1 },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `charm-id-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importDataset(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const backup = normalizeBackupPayload(parsed);

      if (!backup) {
        setMessage("バックアップJSONを読み込めませんでした。形式を確認してください。");
        return;
      }

      const validationError = validateBackupPayload(parsed, backup);

      if (validationError) {
        setMessage(validationError);
        return;
      }

      setCharms(backup.charms);
      setDecisionLogs(backup.decisionLogs);
      setQueryImages([]);
      setCorrectionTargetId("");
      setImportSummary(
        `${backup.charms.length}件のモデル、${backup.decisionLogs.length}件の判定履歴を復元しました。`,
      );
      setMessage("バックアップを復元しました。");
      setActiveView("library");
    } catch {
      setMessage("バックアップJSONを読み込めませんでした。");
    } finally {
      event.target.value = "";
    }
  }

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setShowOnboarding(false);
  }

  function loadDemoDataset() {
    setCharms(sampleCharms);
    setDecisionLogs(demoDecisionLogs());
    setQueryImages([]);
    setCorrectionTargetId("");
    setImportSummary("");
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setShowOnboarding(false);
    setMessage("デモデータを読み込みました。登録一覧と識別フローを試せます。");
    setActiveView("library");
  }

  function resetLocalData() {
    const typedReset = window.prompt(
      "端末内の登録データ、学習写真、判定履歴をすべて削除します。元に戻せません。実行するには RESET と入力してください。",
    );

    if (typedReset !== "RESET") {
      setMessage("RESET が入力されなかったため、端末内データのリセットを中止しました。");
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DECISION_STORAGE_KEY);
    setCharms([]);
    setDecisionLogs([]);
    setQueryImages([]);
    setImportSummary("");
    setSelectedLibraryCharmId("");
    setMessage("端末内データをリセットしました。");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Charm ID</p>
          <h1>チャーム識別</h1>
        </div>
        <div className="count-badge">{charms.length}件</div>
      </header>

      <section className="metrics-strip" aria-label="登録状況">
        <div>
          <span>{charms.reduce((total, charm) => total + charm.images.length, 0)}</span>
          <p>参照写真</p>
        </div>
        <div>
          <span>{charms.reduce((total, charm) => total + learningImageCount(charm), 0)}</span>
          <p>学習写真</p>
        </div>
        <div>
          <span>{queryImages.length}/6</span>
          <p>識別撮影</p>
        </div>
      </section>

      {message ? (
        <p className="status-message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}

      {showOnboarding ? (
        <section className="onboarding-card">
          <div>
            <p className="eyebrow">Getting started</p>
            <h2>6方向登録と追加学習</h2>
            <p>
              まず登録タブで管理番号と6方向写真を保存します。識別時は候補から正解を選ぶと、
              その撮影画像が追加学習されます。
            </p>
          </div>
          <div className="onboarding-actions">
            <button type="button" onClick={loadDemoDataset}>
              デモデータで試す
            </button>
            <button className="secondary-onboarding-action" type="button" onClick={dismissOnboarding}>
              空ではじめる
            </button>
          </div>
        </section>
      ) : null}

      <section className={activeView === "identify" ? "view is-active" : "view"}>
        <div className="section-head">
          <div>
            <h2>撮影して識別</h2>
            <p>まず表を撮影し、迷う場合は裏や側面を追加して候補を絞ります。</p>
            <small className="engine-label">Engine: {colorSignatureEngine.name}</small>
          </div>
        </div>

        {queryImages.length > 0 ? (
          <div className="result-layout">
            {topCandidate ? (
              <article className="match-summary">
                <div>
                  <p>最有力候補</p>
                  <h3>{topCandidate.charm.managementNumber}</h3>
                  <span>{topCandidate.matchedAngles}方向で照合</span>
                </div>
                <strong>{confidenceLabel(topCandidate.score)}</strong>
              </article>
            ) : null}
            {topCandidate && topCandidate.score < 84 && missingQueryAngles.length > 0 ? (
              <div className="next-shot">
                <strong>追加撮影推奨</strong>
                <p>{missingQueryAngles[0].label}を撮ると候補を絞りやすくなります。</p>
              </div>
            ) : null}
            <div className="result-list">
              {candidates.length > 0 ? (
                candidates.map((candidate, index) => (
                  <article className="candidate-card" key={candidate.charm.id}>
                    <div className="candidate-rank">{index + 1}</div>
                    <div>
                      <h3>{candidate.charm.managementNumber}</h3>
                      <p>
                        {candidate.score}%一致 / {candidate.matchedAngles}方向
                      </p>
                    </div>
                    {candidate.bestImage ? (
                      <img src={candidate.bestImage.imageUrl} alt="" />
                    ) : null}
                    <div className="candidate-actions">
                      <button type="button" onClick={() => confirmCandidate(candidate)}>
                        正解にする
                      </button>
                      <button type="button" onClick={() => logDecision(candidate, "rejected", 0)}>
                        違う
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-state">登録済みチャームがありません。</p>
              )}
            </div>
            <button className="secondary-action" type="button" onClick={clearQueryImages}>
              識別撮影をリセット
            </button>
            <div className="correction-panel">
              <h3>候補にない場合</h3>
              <p>正しい管理番号を選ぶと、今回の撮影画像をそのモデルに追加学習します。</p>
              <select
                value={correctionTargetId}
                onChange={(event) => setCorrectionTargetId(event.target.value)}
              >
                <option value="">正しい管理番号を選択</option>
                {charms.map((charm) => (
                  <option key={charm.id} value={charm.id}>
                    {charm.managementNumber}
                  </option>
                ))}
              </select>
              <button type="button" onClick={applyCorrection}>
                選択したモデルに学習
              </button>
            </div>
            <div className="capture-protocol compact-capture-protocol">
              {captureAngles.map((angle) => {
                const image = queryImages.find((query) => query.angleLabel === angle.label);

                return (
                  <label
                    className={image ? "angle-capture is-complete" : "angle-capture"}
                    key={angle.id}
                  >
                    <span>{angle.label}</span>
                    <small>{image ? "撮影済み" : angle.hint}</small>
                    {image ? <img src={image.imageUrl} alt={`${angle.label}の識別写真`} /> : null}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      aria-label={`${angle.label}の識別写真を撮影`}
                      onChange={(event) => identifyImage(event, angle.label)}
                    />
                  </label>
                );
              })}
            </div>
            <CameraPermissionHelp />
          </div>
        ) : (
          <>
            <div className="capture-protocol">
              {captureAngles.map((angle) => (
                <label className="angle-capture" key={angle.id}>
                  <span>{angle.label}</span>
                  <small>{angle.hint}</small>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    aria-label={`${angle.label}の識別写真を撮影`}
                    onChange={(event) => identifyImage(event, angle.label)}
                  />
                </label>
              ))}
            </div>
            <div className="empty-state identify-guide">
              <strong>撮影のコツ</strong>
              <span>まず表を撮影する</span>
              <span>候補が割れたら裏・側面を追加する</span>
              <span>同じ背景と明るさで撮る</span>
            </div>
            <CameraPermissionHelp />
          </>
        )}
      </section>

      <section className={activeView === "register" ? "view is-active" : "view"}>
        <div className="section-head">
          <div>
            <h2>チャーム登録</h2>
            <p>管理番号と6方向の写真を保存します。</p>
          </div>
        </div>

        <form className="register-form" onSubmit={saveCharm}>
          <label>
            管理番号
            <input
              value={managementNumber}
              onChange={(event) => setManagementNumber(event.target.value)}
              placeholder="例: CH-1042"
              inputMode="text"
            />
          </label>

          <label>
            メモ
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="色、形、保管場所など"
              rows={3}
            />
          </label>

          <div className="training-meter">
            <div>
              <span>登録品質</span>
              <strong>{currentQualityScore}%</strong>
            </div>
            <meter min="0" max="100" value={currentQualityScore} />
            <p>
              {missingDraftAngles.length === 0
                ? "6方向が揃っています。識別用の参照データとして登録できます。"
                : `未撮影: ${missingDraftAngles.map((angle) => angle.label).join(" / ")}`}
            </p>
          </div>

          <div className="capture-protocol">
            {captureAngles.map((angle) => {
              const image = draftImages.find((draftImage) => draftImage.angleLabel === angle.label);

              return (
                <div className={image ? "angle-card is-complete" : "angle-card"} key={angle.id}>
                  <label>
                    <span>{angle.label}</span>
                    <small>{angle.hint}</small>
                    {image ? <img src={image.imageUrl} alt={`${angle.label}の登録写真`} /> : null}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      aria-label={`${angle.label}の登録写真を撮影`}
                      onChange={(event) => addImages(event, angle.label)}
                    />
                  </label>
                  {image ? (
                    <button type="button" onClick={() => removeDraftImage(image.id)}>
                      撮り直す
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <CameraPermissionHelp />

          <button className="primary-action" type="submit" disabled={isProcessing}>
            {isProcessing ? "処理中..." : "登録する"}
          </button>
        </form>
      </section>

      <section className={activeView === "library" ? "view is-active" : "view"}>
        <div className="section-head">
          <div>
            <h2>登録一覧</h2>
            <p>登録済みチャームと参照画像を確認できます。</p>
          </div>
        </div>

        <div className="library-controls">
          <label className="library-search">
            管理番号を検索
            <input
              value={librarySearch}
              onChange={(event) => setLibrarySearch(event.target.value)}
              placeholder="例: CH-001"
              inputMode="search"
              type="search"
            />
          </label>

          <label className="library-sort">
            並び替え
            <select
              value={librarySort}
              onChange={(event) => setLibrarySort(event.target.value as LibrarySort)}
            >
              <option value="recent">登録順</option>
              <option value="managementAsc">管理番号 A-Z</option>
              <option value="managementDesc">管理番号 Z-A</option>
            </select>
          </label>
        </div>

        <div className="library-list">
          {charms.length > 0 && filteredCharms.length > 0 ? (
            filteredCharms.map((charm) => {
              const isSelected = selectedLibraryCharm?.id === charm.id;

              return (
                <article className={isSelected ? "library-card is-expanded" : "library-card"} key={charm.id}>
                  <div className="library-card-summary">
                    <div className="library-main">
                      <img src={charm.images[0]?.imageUrl} alt="" />
                      <div>
                        <h3>{charm.managementNumber}</h3>
                        <p>{charm.note || "メモなし"}</p>
                        <span>
                          {captureAngles.filter((angle) =>
                            charm.images.some((image) => image.angleLabel === angle.label),
                          ).length}
                          /6方向・追加学習{learningImageCount(charm)}枚
                        </span>
                      </div>
                    </div>
                    <div className="library-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedLibraryCharmId(isSelected ? "" : charm.id)}
                      >
                        {isSelected ? "閉じる" : "詳細"}
                      </button>
                      <button type="button" onClick={() => deleteCharm(charm.id)}>
                        削除
                      </button>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="library-detail">
                      <dl>
                        <div>
                          <dt>登録日</dt>
                          <dd>{formatDate(charm.createdAt)}</dd>
                        </div>
                        <div>
                          <dt>登録写真</dt>
                          <dd>{charm.images.filter((image) => image.source === "registration").length}枚</dd>
                        </div>
                        <div>
                          <dt>追加学習</dt>
                          <dd>{learningImageCount(charm)}枚</dd>
                        </div>
                      </dl>

                      <div className="library-angle-grid" aria-label={`${charm.managementNumber}の6方向写真`}>
                        {captureAngles.map((angle) => {
                          const angleImages = charm.images.filter((image) => image.angleLabel === angle.label);
                          const primaryImage = angleImages[angleImages.length - 1];

                          return (
                            <figure key={angle.id}>
                              {primaryImage ? (
                                <img src={primaryImage.imageUrl} alt={`${charm.managementNumber} ${angle.label}`} />
                              ) : (
                                <div className="missing-angle">未登録</div>
                              )}
                              <figcaption>
                                <strong>{angle.label}</strong>
                                <span>{angleImages.length}枚</span>
                              </figcaption>
                            </figure>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : charms.length > 0 ? (
            <div className="empty-state library-empty">
              <strong>一致する登録がありません</strong>
              <span>検索語を短くするか、管理番号・メモを確認してください。</span>
              <button type="button" onClick={() => setLibrarySearch("")}>
                検索をクリア
              </button>
            </div>
          ) : (
            <div className="empty-state library-empty">
              <strong>登録データがありません</strong>
              <span>登録タブで6方向写真を保存するか、デモデータを読み込めます。</span>
              <button type="button" onClick={() => setActiveView("register")}>
                登録を始める
              </button>
              <button type="button" onClick={loadDemoDataset}>
                デモデータを読み込む
              </button>
            </div>
          )}
        </div>

        <div className="data-tools">
          <button type="button" onClick={exportDataset}>
            データを書き出す
          </button>
          <label className="import-action">
            バックアップを読み込む
            <input
              type="file"
              accept="application/json,.json"
              aria-label="バックアップJSONを読み込む"
              onChange={importDataset}
            />
          </label>
          <button className="danger-action" type="button" onClick={resetLocalData}>
            端末内データをリセット
          </button>
          <p>
            今は端末内保存です。リセット前や機種変更前はバックアップを書き出してください。
            不要になった端末内データは、この画面から削除できます。
          </p>
          {importSummary ? <strong>{importSummary}</strong> : null}
        </div>

        <div className="app-info-panel">
          <h3>このアプリについて</h3>
          <p>
            現在のバージョンでは、写真・管理番号・判定履歴はこの端末内に保存されます。
            外部サーバーへのアップロードや広告トラッキングは行いません。
          </p>
          <p>
            照合エンジンは公開前検証用のプロトタイプです。候補を確定する前に、管理番号を目視で確認してください。
          </p>
          <p className="app-version">Version {APP_VERSION}</p>
          <a href="/privacy.html" target="_blank" rel="noreferrer">
            プライバシーポリシー
          </a>
          <a href="/support.html" target="_blank" rel="noreferrer">
            サポート
          </a>
        </div>

        {decisionLogs.length > 0 ? (
          <div className="decision-list">
            <h3>最近の判定</h3>
            {decisionLogs.slice(0, 5).map((log) => (
              <p key={log.id}>
                <span>{log.managementNumber}</span>
                {log.decision === "confirmed" ? "確定" : "違う"} / {log.score}% / 学習
                {log.learnedImages}枚
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <nav className="tab-bar" aria-label="主要メニュー">
        <button
          className={activeView === "identify" ? "is-selected" : ""}
          onClick={() => setActiveView("identify")}
          type="button"
        >
          識別
        </button>
        <button
          className={activeView === "register" ? "is-selected" : ""}
          onClick={() => setActiveView("register")}
          type="button"
        >
          登録
        </button>
        <button
          className={activeView === "library" ? "is-selected" : ""}
          onClick={() => setActiveView("library")}
          type="button"
        >
          一覧
        </button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
