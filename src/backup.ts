import {
  BackupPayload,
  captureAngles,
  Charm,
  CharmImage,
  DecisionLog,
  ImageSignature,
} from "./domain";

type BackupNormalizeOptions = {
  makeId: (prefix: string) => string;
  now: () => string;
};

type BackupCreateOptions = {
  now: () => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeManagementNumber(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function missingAngles(images: CharmImage[]) {
  return captureAngles.filter((angle) => !images.some((image) => image.angleLabel === angle.label));
}

function isSupportedImageReference(imageUrl: string) {
  const normalizedImageUrl = imageUrl.trim();

  return (
    normalizedImageUrl.startsWith("data:") ||
    normalizedImageUrl.startsWith("blob:") ||
    /^https?:\/\/[^\s]+$/i.test(normalizedImageUrl)
  );
}

function normalizeSignature(value: unknown): ImageSignature {
  const signature = isRecord(value) ? value : {};

  return {
    red: typeof signature.red === "number" ? signature.red : 0,
    green: typeof signature.green === "number" ? signature.green : 0,
    blue: typeof signature.blue === "number" ? signature.blue : 0,
    brightness: typeof signature.brightness === "number" ? signature.brightness : 0,
  };
}

export function normalizeDecisionLog(
  value: unknown,
  options: BackupNormalizeOptions,
): DecisionLog | null {
  if (!isRecord(value)) {
    return null;
  }

  const decision = value.decision === "rejected" ? "rejected" : "confirmed";

  return {
    id: typeof value.id === "string" ? value.id : options.makeId("decision"),
    managementNumber:
      typeof value.managementNumber === "string" ? value.managementNumber : "UNKNOWN",
    decision,
    score: typeof value.score === "number" ? value.score : 0,
    learnedImages: typeof value.learnedImages === "number" ? value.learnedImages : 0,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : options.now(),
  };
}

export function normalizeCharmImage(
  value: unknown,
  options: BackupNormalizeOptions,
): CharmImage | null {
  if (!isRecord(value)) {
    return null;
  }

  const source =
    value.source === "confirmed-identification" ? "confirmed-identification" : "registration";

  return {
    id: typeof value.id === "string" ? value.id : options.makeId("image"),
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : "",
    angleLabel: typeof value.angleLabel === "string" ? value.angleLabel : captureAngles[0].label,
    signature: normalizeSignature(value.signature),
    source,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : options.now(),
  };
}

export function normalizeCharm(value: unknown, options: BackupNormalizeOptions): Charm | null {
  if (!isRecord(value)) {
    return null;
  }

  const images = Array.isArray(value.images)
    ? value.images
        .map((image) => normalizeCharmImage(image, options))
        .filter((image): image is CharmImage => Boolean(image))
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
    id: typeof value.id === "string" ? value.id : options.makeId("charm"),
    managementNumber,
    note: typeof value.note === "string" ? value.note : "",
    images,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : options.now(),
  };
}

export function normalizeBackupPayload(
  value: unknown,
  options: BackupNormalizeOptions,
): BackupPayload | null {
  if (!isRecord(value) || !Array.isArray(value.charms)) {
    return null;
  }

  const charms = value.charms
    .map((charm) => normalizeCharm(charm, options))
    .filter((charm): charm is Charm => Boolean(charm));

  if (charms.length === 0) {
    return null;
  }

  const decisionLogs = Array.isArray(value.decisionLogs)
    ? value.decisionLogs
        .map((log) => normalizeDecisionLog(log, options))
        .filter((log): log is DecisionLog => Boolean(log))
    : [];

  return {
    charms,
    decisionLogs,
    exportedAt: typeof value.exportedAt === "string" ? value.exportedAt : options.now(),
    version: 1,
  };
}

export function createBackupPayload(
  charms: Charm[],
  decisionLogs: DecisionLog[],
  options: BackupCreateOptions,
): BackupPayload {
  return {
    charms,
    decisionLogs,
    exportedAt: options.now(),
    version: 1,
  };
}

export function validateBackupPayload(value: unknown, backup: BackupPayload) {
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

    const emptyImageAngles = charm.images
      .filter((image) => image.imageUrl.trim().length === 0)
      .map((image) => image.angleLabel);

    if (emptyImageAngles.length > 0) {
      return `${normalizedManagementNumber} の画像データが空です: ${emptyImageAngles.join(" / ")}`;
    }

    const unsupportedImageAngles = charm.images
      .filter((image) => !isSupportedImageReference(image.imageUrl))
      .map((image) => image.angleLabel);

    if (unsupportedImageAngles.length > 0) {
      return `${normalizedManagementNumber} の画像データ形式が不正です: ${unsupportedImageAngles.join(" / ")}`;
    }
  }

  return null;
}
