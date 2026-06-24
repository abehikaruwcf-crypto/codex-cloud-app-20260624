export type View = "identify" | "register" | "library";

export type ImageSource = "registration" | "confirmed-identification";

export type ImageSignature = {
  red: number;
  green: number;
  blue: number;
  brightness: number;
};

export type CharmImage = {
  id: string;
  imageUrl: string;
  angleLabel: string;
  signature: ImageSignature;
  source: ImageSource;
  createdAt: string;
};

export type Charm = {
  id: string;
  managementNumber: string;
  note: string;
  images: CharmImage[];
  createdAt: string;
};

export type Candidate = {
  charm: Charm;
  score: number;
  bestImage?: CharmImage;
  matchedAngles: number;
};

export type DecisionLog = {
  id: string;
  managementNumber: string;
  decision: "confirmed" | "rejected";
  score: number;
  learnedImages: number;
  createdAt: string;
};

export type BackupPayload = {
  charms: Charm[];
  decisionLogs: DecisionLog[];
  exportedAt: string;
  version: 1;
};

export const captureAngles = [
  { id: "front", label: "表", hint: "正面の模様や刻印が見える向き" },
  { id: "back", label: "裏", hint: "裏側の形状や留め具が見える向き" },
  { id: "right", label: "右側面", hint: "厚みと右側の輪郭" },
  { id: "left", label: "左側面", hint: "厚みと左側の輪郭" },
  { id: "top", label: "上側面", hint: "上部の金具や穴の形" },
  { id: "bottom", label: "下側面", hint: "下部の輪郭や装飾" },
];

export const angleSuggestions = captureAngles.map((angle) => angle.label);
