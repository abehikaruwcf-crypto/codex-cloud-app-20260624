import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const profiles = [
  {
    key: "iphone-6-9",
    label: "iPhone 6.9 inch App Store primary",
    outputDir: "outputs/app-store-screenshots-6-9",
    expectedSize: "1320x2868",
  },
  {
    key: "iphone-6-5",
    label: "iPhone 6.5 inch App Store fallback",
    outputDir: "outputs/app-store-screenshots-6-5",
    expectedSize: "1242x2688",
  },
];

const shots = [
  { file: "01-onboarding.jpg", appStorePurpose: "Onboarding and demo start" },
  { file: "02-library.jpg", appStorePurpose: "Library and registered model detail" },
  { file: "03-identify.jpg", appStorePurpose: "Identification candidate ranking" },
  { file: "04-register.jpg", appStorePurpose: "Six-angle registration" },
  { file: "05-learning.jpg", appStorePurpose: "Human-confirmed learning success" },
];

function fileInfo(relativePath, expectedSize) {
  const absolutePath = join(root, relativePath);

  if (!existsSync(absolutePath)) {
    return {
      path: relativePath,
      exists: false,
      ok: false,
      detail: "missing",
    };
  }

  const output = execFileSync("file", [absolutePath], { encoding: "utf8" }).trim();
  const bytes = statSync(absolutePath).size;
  const ok = output.includes(expectedSize) && bytes > 10_000;

  return {
    path: relativePath,
    exists: true,
    ok,
    bytes,
    detail: output,
  };
}

const profileReports = profiles.map((profile) => {
  const files = shots.map((shot) => ({
    ...shot,
    ...fileInfo(`${profile.outputDir}/${shot.file}`, profile.expectedSize),
  }));

  return {
    ...profile,
    files,
    ready: files.every((file) => file.ok),
    missing: files.filter((file) => !file.exists).map((file) => file.file),
    invalid: files.filter((file) => file.exists && !file.ok).map((file) => file.file),
  };
});

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Verify generated App Store screenshot-size assets before App Store Connect upload.",
  sourceDoc: "docs/app-store-screenshots.md",
  generationCommand: "npm run appstore:screenshots:submission",
  reviewRequirement: "Review final screenshots against the release build before App Review submission.",
  ready: profileReports.every((profile) => profile.ready),
  profiles: profileReports,
};

console.log(JSON.stringify(packet, null, 2));

