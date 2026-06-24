import assert from "node:assert/strict";
import test from "node:test";
import { captureAngles, Charm, CharmImage, ImageSignature } from "../src/domain";
import {
  createLearningImages,
  MAX_IMAGES_PER_ANGLE,
  mergeLearningImages,
} from "../src/learning";
import { colorSignatureEngine } from "../src/matchingEngine";

function image(
  id: string,
  angleLabel: string,
  signature: ImageSignature,
  source: CharmImage["source"] = "registration",
): CharmImage {
  return {
    id,
    angleLabel,
    signature,
    source,
    imageUrl: `data:test/${id}`,
    createdAt: `2026-06-25T00:00:${id.padStart(2, "0")}Z`,
  };
}

function charm(id: string, managementNumber: string, images: CharmImage[]): Charm {
  return {
    id,
    managementNumber,
    note: "",
    images,
    createdAt: "2026-06-25T00:00:00.000Z",
  };
}

const gold = { red: 220, green: 174, blue: 72, brightness: 155 };
const silver = { red: 166, green: 177, blue: 186, brightness: 176 };
const dark = { red: 35, green: 45, blue: 50, brightness: 43 };

test("matching ranks the closest charm first and returns candidates in descending score order", () => {
  const query = image("query-front", "表", { ...gold, red: 219 });
  const goldCharm = charm("gold", "CH-001", [image("gold-front", "表", gold)]);
  const silverCharm = charm("silver", "CH-002", [image("silver-front", "表", silver)]);

  const candidates = colorSignatureEngine.findCandidates([query], [silverCharm, goldCharm]);

  assert.equal(candidates[0].charm.managementNumber, "CH-001");
  assert.equal(candidates[0].matchedAngles, 1);
  assert.ok(candidates[0].score > candidates[1].score);
  assert.deepEqual(
    candidates.map((candidate) => candidate.score),
    [...candidates].map((candidate) => candidate.score).sort((first, second) => second - first),
  );
});

test("matching prefers same-angle references over better-looking references from other angles", () => {
  const query = image("query-front", "表", gold);
  const testCharm = charm("mixed", "CH-003", [
    image("mixed-front", "表", dark),
    image("mixed-back", "裏", gold),
  ]);

  const [candidate] = colorSignatureEngine.findCandidates([query], [testCharm]);

  assert.equal(candidate.bestImage?.id, "mixed-front");
  assert.ok(candidate.score < 70);
});

test("matching falls back to all registered images when a query angle has no reference", () => {
  const query = image("query-top", "上側面", silver);
  const fallbackCharm = charm("fallback", "CH-004", [image("fallback-back", "裏", silver)]);

  const [candidate] = colorSignatureEngine.findCandidates([query], [fallbackCharm]);

  assert.equal(candidate.bestImage?.id, "fallback-back");
  assert.equal(candidate.score, 100);
  assert.equal(candidate.matchedAngles, 1);
});

test("confirmed learning images are copied with new ids, timestamps, and learning source", () => {
  let counter = 0;
  const learnedImages = createLearningImages(
    [
      image("query-front", "表", gold),
      image("query-back", "裏", silver),
    ],
    {
      makeId: () => `learned-${(counter += 1)}`,
      now: () => "2026-06-25T09:00:00.000Z",
    },
  );

  assert.deepEqual(
    learnedImages.map((learnedImage) => learnedImage.id),
    ["learned-1", "learned-2"],
  );
  assert.ok(
    learnedImages.every(
      (learnedImage) =>
        learnedImage.source === "confirmed-identification" &&
        learnedImage.createdAt === "2026-06-25T09:00:00.000Z",
    ),
  );
});

test("learning merge keeps the latest examples per angle and preserves registration angle grouping", () => {
  const frontImages = Array.from({ length: MAX_IMAGES_PER_ANGLE }, (_, index) =>
    image(`front-${index}`, "表", gold),
  );
  const learnedFrontImages = [
    image("learned-front-1", "表", gold, "confirmed-identification"),
    image("learned-front-2", "表", gold, "confirmed-identification"),
  ];
  const backImage = image("back-0", "裏", silver);
  const sourceCharm = charm("gold", "CH-001", [...frontImages, backImage]);

  const updatedCharm = mergeLearningImages(sourceCharm, learnedFrontImages);
  const updatedFrontImages = updatedCharm.images.filter((updatedImage) => updatedImage.angleLabel === "表");

  assert.equal(updatedFrontImages.length, MAX_IMAGES_PER_ANGLE);
  assert.equal(updatedFrontImages[0].id, "front-2");
  assert.equal(updatedFrontImages.at(-1)?.id, "learned-front-2");
  assert.equal(updatedCharm.images.find((updatedImage) => updatedImage.angleLabel === "裏")?.id, "back-0");
  assert.deepEqual(
    [...new Set(updatedCharm.images.map((updatedImage) => updatedImage.angleLabel))],
    captureAngles.slice(0, 2).map((angle) => angle.label),
  );
});
