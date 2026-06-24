import { Candidate, Charm, CharmImage, ImageSignature } from "./domain";

export type MatchingEngine = {
  name: string;
  findCandidates: (queries: CharmImage[], charms: Charm[]) => Candidate[];
};

function scoreSignature(query: ImageSignature, reference: ImageSignature) {
  const distance = Math.sqrt(
    (query.red - reference.red) ** 2 +
      (query.green - reference.green) ** 2 +
      (query.blue - reference.blue) ** 2 +
      ((query.brightness - reference.brightness) * 0.7) ** 2,
  );

  return Math.max(0, Math.round(100 - (distance / 441) * 100));
}

export const colorSignatureEngine: MatchingEngine = {
  name: "Color signature prototype",
  findCandidates(queries, charms) {
    return charms
      .map((charm) => {
        const scoredQueries = queries.map((query) => {
          const sameAngleImages = charm.images.filter(
            (image) => image.angleLabel === query.angleLabel,
          );
          const comparableImages = sameAngleImages.length > 0 ? sameAngleImages : charm.images;
          const best = comparableImages
            .map((image) => ({
              image,
              score: scoreSignature(query.signature, image.signature),
            }))
            .sort((first, second) => second.score - first.score)[0];

          return best;
        });

        const validScores = scoredQueries.filter(Boolean);
        const best = [...validScores].sort((first, second) => second.score - first.score)[0];
        const averageScore =
          validScores.length === 0
            ? 0
            : Math.round(
                validScores.reduce((total, score) => total + score.score, 0) /
                  validScores.length,
              );

        return {
          charm,
          score: averageScore,
          bestImage: best?.image,
          matchedAngles: validScores.length,
        };
      })
      .sort((first, second) => second.score - first.score)
      .slice(0, 3);
  },
};
