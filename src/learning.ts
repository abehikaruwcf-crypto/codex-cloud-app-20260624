import { angleSuggestions, Charm, CharmImage } from "./domain";

export const MAX_IMAGES_PER_ANGLE = 8;
export const DIRECT_LEARNING_MIN_SCORE = 74;

type LearningImageOptions = {
  makeId: () => string;
  now: () => string;
};

export function createLearningImages(
  sourceImages: CharmImage[],
  options: LearningImageOptions,
): CharmImage[] {
  return sourceImages.map((image) => ({
    ...image,
    id: options.makeId(),
    source: "confirmed-identification",
    createdAt: options.now(),
  }));
}

export function canDirectlyLearnCandidate(score: number) {
  return score >= DIRECT_LEARNING_MIN_SCORE;
}

export function mergeLearningImages(charm: Charm, learnedImages: CharmImage[]): Charm {
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
