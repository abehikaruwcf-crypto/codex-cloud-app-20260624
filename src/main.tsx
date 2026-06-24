import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type View = "identify" | "register" | "library";

type ImageSignature = {
  red: number;
  green: number;
  blue: number;
  brightness: number;
};

type CharmImage = {
  id: string;
  imageUrl: string;
  angleLabel: string;
  signature: ImageSignature;
  createdAt: string;
};

type Charm = {
  id: string;
  managementNumber: string;
  note: string;
  images: CharmImage[];
  createdAt: string;
};

type Candidate = {
  charm: Charm;
  score: number;
  bestImage?: CharmImage;
};

type DecisionLog = {
  id: string;
  managementNumber: string;
  decision: "confirmed" | "rejected";
  score: number;
  createdAt: string;
};

const STORAGE_KEY = "charm-id-camera-app-charms";
const DECISION_STORAGE_KEY = "charm-id-camera-app-decisions";

const sampleCharms: Charm[] = [
  {
    id: "sample-1",
    managementNumber: "CH-001",
    note: "サンプル: ゴールド系",
    createdAt: new Date().toISOString(),
    images: [
      {
        id: "sample-1-img",
        angleLabel: "正面",
        createdAt: new Date().toISOString(),
        imageUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480' viewBox='0 0 480 480'%3E%3Crect width='480' height='480' fill='%23f7efe0'/%3E%3Ccircle cx='240' cy='240' r='132' fill='%23d4a944'/%3E%3Ccircle cx='240' cy='240' r='66' fill='%23fff7d7'/%3E%3C/svg%3E",
        signature: { red: 212, green: 169, blue: 68, brightness: 150 },
      },
    ],
  },
  {
    id: "sample-2",
    managementNumber: "CH-002",
    note: "サンプル: シルバー系",
    createdAt: new Date().toISOString(),
    images: [
      {
        id: "sample-2-img",
        angleLabel: "正面",
        createdAt: new Date().toISOString(),
        imageUrl:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='480' viewBox='0 0 480 480'%3E%3Crect width='480' height='480' fill='%23edf1f4'/%3E%3Cpath d='M240 88 378 240 240 392 102 240Z' fill='%23a6b1ba'/%3E%3Ccircle cx='240' cy='240' r='62' fill='%23f9fbfc'/%3E%3C/svg%3E",
        signature: { red: 166, green: 177, blue: 186, brightness: 176 },
      },
    ],
  },
];

const angleSuggestions = ["正面", "裏面", "左斜め", "右斜め", "上部", "刻印"];

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
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

function scoreSignature(query: ImageSignature, reference: ImageSignature) {
  const distance = Math.sqrt(
    (query.red - reference.red) ** 2 +
      (query.green - reference.green) ** 2 +
      (query.blue - reference.blue) ** 2 +
      ((query.brightness - reference.brightness) * 0.7) ** 2,
  );

  return Math.max(0, Math.round(100 - (distance / 441) * 100));
}

function findCandidates(query: ImageSignature, charms: Charm[]): Candidate[] {
  return charms
    .map((charm) => {
      const scoredImages = charm.images.map((image) => ({
        image,
        score: scoreSignature(query, image.signature),
      }));
      const best = scoredImages.sort((first, second) => second.score - first.score)[0];

      return {
        charm,
        score: best?.score ?? 0,
        bestImage: best?.image,
      };
    })
    .sort((first, second) => second.score - first.score)
    .slice(0, 3);
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
  const angleCount = new Set(images.map((image) => image.angleLabel)).size;
  const imageScore = Math.min(images.length, 6) * 12;
  const angleScore = Math.min(angleCount, 6) * 5;

  return Math.min(100, imageScore + angleScore);
}

function loadDecisions() {
  const stored = localStorage.getItem(DECISION_STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as DecisionLog[];
  } catch {
    return [];
  }
}

function loadCharms() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return sampleCharms;
  }

  try {
    return JSON.parse(stored) as Charm[];
  } catch {
    return sampleCharms;
  }
}

function App() {
  const [activeView, setActiveView] = useState<View>("identify");
  const [charms, setCharms] = useState<Charm[]>(loadCharms);
  const [managementNumber, setManagementNumber] = useState("");
  const [note, setNote] = useState("");
  const [draftImages, setDraftImages] = useState<CharmImage[]>([]);
  const [queryImage, setQueryImage] = useState<string | null>(null);
  const [querySignature, setQuerySignature] = useState<ImageSignature | null>(null);
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>(loadDecisions);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charms));
  }, [charms]);

  useEffect(() => {
    localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(decisionLogs));
  }, [decisionLogs]);

  const candidates = useMemo(() => {
    if (!querySignature) {
      return [];
    }

    return findCandidates(querySignature, charms);
  }, [charms, querySignature]);

  const topCandidate = candidates[0];
  const currentQualityScore = qualityScore(draftImages);

  async function addImages(event: ChangeEvent<HTMLInputElement>) {
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
            angleLabel: angleSuggestions[(draftImages.length + index) % angleSuggestions.length],
            createdAt: new Date().toISOString(),
          };
        }),
      );

      setDraftImages((current) => [...current, ...nextImages]);
    } catch {
      setMessage("画像を読み込めませんでした。別の写真でもう一度試してください。");
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  async function identifyImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsProcessing(true);
    setMessage("");

    try {
      const imageUrl = await fileToDataUrl(file);
      const signature = await signatureFromImage(imageUrl);
      setQueryImage(imageUrl);
      setQuerySignature(signature);
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

    if (draftImages.length < 2) {
      setMessage("識別精度を上げるため、最低2枚の写真を登録してください。");
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

  function logDecision(candidate: Candidate, decision: DecisionLog["decision"]) {
    const nextLog: DecisionLog = {
      id: makeId("decision"),
      managementNumber: candidate.charm.managementNumber,
      decision,
      score: candidate.score,
      createdAt: new Date().toISOString(),
    };

    setDecisionLogs((current) => [nextLog, ...current].slice(0, 20));
    setMessage(
      decision === "confirmed"
        ? `${candidate.charm.managementNumber} を確定しました。`
        : `${candidate.charm.managementNumber} を違う候補として記録しました。`,
    );
  }

  function exportDataset() {
    const payload = JSON.stringify({ charms, decisionLogs, exportedAt: new Date().toISOString() });
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `charm-id-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
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
          <span>{decisionLogs.length}</span>
          <p>判定履歴</p>
        </div>
        <div>
          <span>{topCandidate ? `${topCandidate.score}%` : "-"}</span>
          <p>最新候補</p>
        </div>
      </section>

      {message ? <p className="status-message">{message}</p> : null}

      <section className={activeView === "identify" ? "view is-active" : "view"}>
        <div className="section-head">
          <div>
            <h2>撮影して識別</h2>
            <p>iPhoneの背面カメラで撮影し、登録済み写真から候補を出します。</p>
          </div>
        </div>

        <label className="camera-button">
          <span>カメラで撮影</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={identifyImage}
          />
        </label>

        {queryImage ? (
          <div className="result-layout">
            <img className="query-preview" src={queryImage} alt="識別対象のチャーム" />
            {topCandidate ? (
              <article className="match-summary">
                <div>
                  <p>最有力候補</p>
                  <h3>{topCandidate.charm.managementNumber}</h3>
                </div>
                <strong>{confidenceLabel(topCandidate.score)}</strong>
              </article>
            ) : null}
            <div className="result-list">
              {candidates.length > 0 ? (
                candidates.map((candidate, index) => (
                  <article className="candidate-card" key={candidate.charm.id}>
                    <div className="candidate-rank">{index + 1}</div>
                    <div>
                      <h3>{candidate.charm.managementNumber}</h3>
                      <p>
                        {candidate.score}%一致 / {confidenceLabel(candidate.score)}
                      </p>
                    </div>
                    {candidate.bestImage ? (
                      <img src={candidate.bestImage.imageUrl} alt="" />
                    ) : null}
                    <div className="candidate-actions">
                      <button type="button" onClick={() => logDecision(candidate, "confirmed")}>
                        確定
                      </button>
                      <button type="button" onClick={() => logDecision(candidate, "rejected")}>
                        違う
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="empty-state">登録済みチャームがありません。</p>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state identify-guide">
            <strong>撮影のコツ</strong>
            <span>チャームを画面中央に置く</span>
            <span>背景は無地に近づける</span>
            <span>明るさを揃えて撮る</span>
          </div>
        )}
      </section>

      <section className={activeView === "register" ? "view is-active" : "view"}>
        <div className="section-head">
          <div>
            <h2>チャーム登録</h2>
            <p>管理番号と複数角度の写真を保存します。</p>
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
            <p>最低2枚、できれば正面・裏面・斜めの3方向以上を登録してください。</p>
          </div>

          <label className="camera-button secondary">
            <span>写真を追加</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={addImages}
            />
          </label>

          <div className="photo-grid">
            {draftImages.map((image) => (
              <figure key={image.id}>
                <img src={image.imageUrl} alt={image.angleLabel} />
                <figcaption>
                  <select
                    value={image.angleLabel}
                    onChange={(event) => updateDraftAngle(image.id, event.target.value)}
                  >
                    {angleSuggestions.map((angle) => (
                      <option key={angle} value={angle}>
                        {angle}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeDraftImage(image.id)}>
                    削除
                  </button>
                </figcaption>
              </figure>
            ))}
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
                  <span>{charm.images.length}枚登録</span>
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
          <p>今は端末内保存です。バックアップを残すと機種変更や本番DB移行で使えます。</p>
        </div>

        {decisionLogs.length > 0 ? (
          <div className="decision-list">
            <h3>最近の判定</h3>
            {decisionLogs.slice(0, 5).map((log) => (
              <p key={log.id}>
                <span>{log.managementNumber}</span>
                {log.decision === "confirmed" ? "確定" : "違う"} / {log.score}%
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
