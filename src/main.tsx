import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
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

type AppShotMode = "onboarding" | "register" | "identify" | "library";

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

  return {
    id: typeof value.id === "string" ? value.id : makeId("charm"),
    managementNumber:
      typeof value.managementNumber === "string" ? value.managementNumber : "UNKNOWN",
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

function loadCharms() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return sampleCharms;
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
    return sampleCharms;
  }
}

function onboardingDismissed() {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

function App() {
  const shotMode = appShotMode();
  const [activeView, setActiveView] = useState<View>(
    shotMode === "register" ? "register" : shotMode === "library" ? "library" : "identify",
  );
  const [charms, setCharms] = useState<Charm[]>(shotMode ? sampleCharms : loadCharms);
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

    if (!managementNumber.trim()) {
      setMessage("管理番号を入力してください。");
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
      managementNumber: managementNumber.trim(),
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
    setCharms((current) => current.filter((charm) => charm.id !== charmId));
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
    const confirmed = window.confirm(
      "端末内の登録データ、学習写真、判定履歴を削除します。元に戻せません。実行しますか？",
    );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DECISION_STORAGE_KEY);
    setCharms(sampleCharms);
    setDecisionLogs([]);
    setQueryImages([]);
    setImportSummary("");
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

      {message ? <p className="status-message">{message}</p> : null}

      {showOnboarding ? (
        <section className="onboarding-card">
          <div>
            <p className="eyebrow">Getting started</p>
            <h2>6方向で登録し、現場写真で育てます</h2>
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
                      onChange={(event) => identifyImage(event, angle.label)}
                    />
                  </label>
                );
              })}
            </div>
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

        <div className="library-list">
          {charms.map((charm) => (
            <article className="library-card" key={charm.id}>
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
              <button type="button" onClick={() => deleteCharm(charm.id)}>
                削除
              </button>
            </article>
          ))}
        </div>

        <div className="data-tools">
          <button type="button" onClick={exportDataset}>
            データを書き出す
          </button>
          <label className="import-action">
            バックアップを読み込む
            <input type="file" accept="application/json,.json" onChange={importDataset} />
          </label>
          <button className="danger-action" type="button" onClick={resetLocalData}>
            端末内データをリセット
          </button>
          <p>
            今は端末内保存です。バックアップを書き出しておくと、機種変更や本番DB移行で使えます。
          </p>
          {importSummary ? <strong>{importSummary}</strong> : null}
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
    <App />
  </React.StrictMode>,
);
