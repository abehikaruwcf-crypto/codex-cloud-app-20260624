import { execFileSync } from "node:child_process";

function run(script) {
  try {
    return {
      ok: true,
      output: execFileSync("npm", ["run", script], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim(),
    };
  } catch (error) {
    return {
      ok: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim(),
    };
  }
}

function parseJsonOutput(output, label) {
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`${label} did not include JSON output.`);
  }
  return JSON.parse(output.slice(jsonStart));
}

function field(screen, fieldName, value, source, options = {}) {
  return {
    screen,
    field: fieldName,
    value,
    source,
    copyReady: options.copyReady ?? (typeof value === "string" ? !/^<.+>$/.test(value) : value != null),
    manualBlocker: options.manualBlocker ?? null,
    notes: options.notes ?? null,
  };
}

const checklist = parseJsonOutput(run("appstore:submission-checklist").output, "appstore:submission-checklist");
const metadata = parseJsonOutput(run("appstore:metadata").output, "appstore:metadata");
const privacy = parseJsonOutput(run("appstore:privacy").output, "appstore:privacy");
const rating = parseJsonOutput(run("appstore:rating").output, "appstore:rating");
const accessibility = parseJsonOutput(run("appstore:accessibility").output, "appstore:accessibility");
const screenshotPacket = parseJsonOutput(run("appstore:screenshot-packet").output, "appstore:screenshot-packet");
const xcodePacket = parseJsonOutput(run("appstore:xcode-packet").output, "appstore:xcode-packet");
const testflightPacket = parseJsonOutput(run("appstore:testflight-packet").output, "appstore:testflight-packet");

const appInfo = checklist.screens.find((screen) => screen.screen === "App Information")?.fields ?? {};
const appPrivacy = checklist.screens.find((screen) => screen.screen === "App Privacy")?.fields ?? {};
const versionInfo = checklist.screens.find((screen) => screen.screen === "Version Information")?.fields ?? {};
const reviewInfo = checklist.screens.find((screen) => screen.screen === "App Review Information")?.fields ?? {};
const testflight = checklist.screens.find((screen) => screen.screen === "TestFlight")?.fields ?? {};
const build = checklist.screens.find((screen) => screen.screen === "Build")?.fields ?? {};

const fields = [
  field("App Information", "Name", appInfo.name, "npm run appstore:submission-checklist"),
  field("App Information", "Bundle ID", appInfo.bundleId, "npm run appstore:submission-checklist"),
  field("App Information", "SKU", appInfo.sku, "npm run appstore:submission-checklist"),
  field("App Information", "Primary Language", appInfo.primaryLanguage, "npm run appstore:submission-checklist"),
  field("App Information", "Category", appInfo.category, "npm run appstore:submission-checklist"),
  field("App Information", "Secondary Category", appInfo.secondaryCategory, "npm run appstore:submission-checklist"),

  field("Version Information", "Version", versionInfo.version, "npm run appstore:submission-checklist"),
  field("Version Information", "Copyright", versionInfo.copyright, "npm run appstore:signoff-template", {
    copyReady: !/^<.+>$/.test(String(versionInfo.copyright ?? "")),
    manualBlocker: "App Store copyright holder",
  }),
  field("Version Information", "Subtitle", metadata.japaneseListing.subtitle, "npm run appstore:metadata"),
  field("Version Information", "Promotional Text", versionInfo.promotionalText, "npm run appstore:submission-checklist"),
  field("Version Information", "Description", versionInfo.description, "npm run appstore:submission-checklist"),
  field("Version Information", "Keywords", versionInfo.keywords, "npm run appstore:submission-checklist"),
  field("Version Information", "What's New", versionInfo.whatsNew, "npm run appstore:submission-checklist"),
  field("Version Information", "Support URL", versionInfo.supportUrl, "npm run appstore:submission-checklist"),

  field("App Privacy", "Privacy Policy URL", appPrivacy.privacyPolicyUrl, "npm run appstore:submission-checklist"),
  field("App Privacy", "Data Collected", privacy.appStoreConnectAnswers.dataCollected, "npm run appstore:privacy"),
  field("App Privacy", "Tracking", privacy.appStoreConnectAnswers.tracking, "npm run appstore:privacy"),
  field("App Privacy", "Data Linked to User", privacy.appStoreConnectAnswers.dataLinkedToUser, "npm run appstore:privacy"),
  field("App Privacy", "Data Not Linked to User", privacy.appStoreConnectAnswers.dataNotLinkedToUser, "npm run appstore:privacy"),

  field("Age Rating", "Expected Rating", rating.expectedRating, "npm run appstore:rating", {
    notes: "Confirm Apple-calculated result in App Store Connect before final signoff.",
  }),
  field("Accessibility", "Nutrition Labels", accessibility.currentRecommendation, "npm run appstore:accessibility", {
    notes: "Do not claim accessibility features until physical iPhone validation passes.",
  }),

  field("Build", "Expected Build", build.expectedBuild, "npm run appstore:xcode-packet", {
    copyReady: xcodePacket.readyForArchive === true,
    manualBlocker: xcodePacket.readyForArchive ? null : "Full Xcode selected",
  }),
  field("Build", "Bundle ID", build.bundleId, "npm run appstore:xcode-packet"),

  field("Screenshots", "iPhone 6.9 inch screenshot set", "outputs/app-store-screenshots-6-9/*.jpg", "npm run appstore:screenshot-packet", {
    copyReady: screenshotPacket.profiles.some((profile) => profile.key === "iphone-6-9" && profile.ready),
  }),
  field("Screenshots", "iPhone 6.5 inch screenshot set", "outputs/app-store-screenshots-6-5/*.jpg", "npm run appstore:screenshot-packet", {
    copyReady: screenshotPacket.profiles.some((profile) => profile.key === "iphone-6-5" && profile.ready),
  }),

  field("App Review Information", "Sign-in required", reviewInfo.signInRequired, "npm run appstore:submission-checklist"),
  field("App Review Information", "Demo account required", reviewInfo.demoAccountRequired, "npm run appstore:submission-checklist"),
  field("App Review Information", "Review notes", reviewInfo.notes, "npm run appstore:submission-checklist"),
  field("App Review Information", "Content rights", reviewInfo.contentRights, "npm run appstore:submission-checklist"),
  field("App Review Information", "Export compliance", reviewInfo.exportCompliance, "npm run appstore:submission-checklist"),

  field("TestFlight", "TestFlight notes", testflight.notes, "npm run appstore:submission-checklist"),
  field("TestFlight", "Evidence fields", testflightPacket.evidenceFields.map((item) => item.key).join(", "), "npm run appstore:testflight-packet", {
    copyReady: false,
    manualBlocker: "Final App Review signoff",
  }),
];

const requiredScreens = [
  "App Information",
  "Version Information",
  "App Privacy",
  "Age Rating",
  "Accessibility",
  "Build",
  "Screenshots",
  "App Review Information",
  "TestFlight",
];

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Flat App Store Connect field copy map for Charm ID submission.",
  sourcePacket: "npm run appstore:submission-checklist",
  release: checklist.release,
  counts: {
    fields: fields.length,
    copyReady: fields.filter((item) => item.copyReady).length,
    blocked: fields.filter((item) => !item.copyReady).length,
  },
  requiredScreens,
  fields,
  blockedFields: fields.filter((item) => !item.copyReady),
};

console.log(JSON.stringify(packet, null, 2));
