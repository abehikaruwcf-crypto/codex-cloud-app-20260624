# Charm ID Camera App Requirements

## Goal

Build a mobile-first web app that identifies a physical charm from a smartphone camera image and displays its management number.

## Core Workflow

### Register a charm

1. User creates a new charm record.
2. User enters the charm's management number.
3. User captures or uploads multiple images of the same charm from different angles.
4. App stores the management number and training/reference images together.

### Identify a charm

1. User opens the identification camera.
2. User captures or uploads an image of an unknown charm.
3. App compares the image against registered charm data.
4. App displays the most likely management number and confidence/candidate ranking.
5. User can confirm the result or mark it as incorrect.

## MVP Scope

- Mobile-first React/Vite UI.
- Charm registration form with management number input.
- Multi-image capture/upload for each charm.
- Charm list/detail view.
- Identify screen for camera/upload.
- Local or simple backend-backed storage of charm records and images.
- Similarity-based matching prototype.
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
  images: CharmImage[];
  createdAt: string;
  updatedAt: string;
};

type CharmImage = {
  id: string;
  charmId: string;
  imageUrl: string;
  angleLabel?: string;
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
5. Add a clear ML integration boundary for a real image-similarity model.
