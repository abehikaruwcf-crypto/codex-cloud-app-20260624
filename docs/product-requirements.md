# Charm ID Camera App Requirements

## Goal

Build a mobile-first web app that identifies a physical charm from a smartphone camera image and displays its management number.

## Core Workflow

### Register a charm

1. User creates a new charm record.
2. User enters the charm's management number.
3. User captures six required images of the same charm: front, back, right side, left side, top side, and bottom side.
4. App stores the management number and training/reference images together.

### Identify a charm

1. User opens the identification camera.
2. User captures a first image of an unknown charm, usually the front.
3. If confidence is low, app prompts the user to add another angle such as back or side.
4. App compares the captured angles against registered charm data angle-by-angle.
5. App displays the most likely management number and confidence/candidate ranking.
6. User can confirm the result or mark it as incorrect.

## MVP Scope

- Mobile-first React/Vite UI.
- Charm registration form with management number input.
- Six-direction capture protocol for each charm.
- Charm list/detail view.
- Identify screen for camera/upload.
- Local or simple backend-backed storage of charm records and images.
- Similarity-based matching prototype that can use one or more captured angles.
- Result screen showing top candidate and confidence.

## Out Of Scope For First MVP

- Fully automated model training pipeline.
- Native iOS/Android app release.
- Multi-user permissions.
- Barcode/QR-code printing.
- Complex inventory workflows.

## Suggested Technical Direction

Start with a browser-based prototype:

- Use `getUserMedia` or file input for smartphone camera capture.
- Store charm records and image references in a simple data layer.
- Use an embedding/similarity approach before custom model training.
- Keep the ML layer replaceable so the first version can use a prototype matcher and later move to a dedicated image model or server-side inference.

## Data Model Draft

```ts
type Charm = {
  id: string;
  managementNumber: string;
  images: CharmImage[]; // one each for front, back, right side, left side, top side, bottom side
  createdAt: string;
  updatedAt: string;
};

type CharmImage = {
  id: string;
  charmId: string;
  imageUrl: string;
  angleLabel: "表" | "裏" | "右側面" | "左側面" | "上側面" | "下側面";
  embedding?: number[];
  createdAt: string;
};

type IdentificationResult = {
  queryImageUrl: string;
  candidates: Array<{
    charmId: string;
    managementNumber: string;
    score: number;
  }>;
};
```

## Open Questions

1. How many charm types and images per charm should the first version support?
2. Should identification work only on this user's dataset, or across a shared company-wide dataset?
3. Is an internet connection always available during identification?
4. Should images be stored in the cloud, locally on the device, or both?
5. How accurate does the first MVP need to be before it is operationally useful?

## First Implementation Steps

1. Replace the landing page with a mobile-first app shell.
2. Add three primary tabs: Register, Identify, Library.
3. Implement local mock data and image upload/camera capture UI.
4. Add a placeholder matcher that returns candidate charms from the registered library.
5. Match first by the same captured angle when possible, then fall back to all images.
6. Add a clear ML integration boundary for a real image-similarity model.

## 3D Direction

The first practical version should not attempt full 3D model generation. Instead, it should enforce a 3D-like capture protocol:

- Front
- Back
- Right side
- Left side
- Top side
- Bottom side

This gives the matching layer multi-angle evidence without requiring heavy photogrammetry. Full 3D reconstruction can be evaluated later after enough real charm data is collected.
