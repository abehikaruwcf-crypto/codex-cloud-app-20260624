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

const connectPacket = parseJsonOutput(run("appstore:connect-packet").output, "appstore:connect-packet");
const privacyPacket = parseJsonOutput(run("appstore:privacy").output, "appstore:privacy");
const screenshotPacket = parseJsonOutput(run("appstore:screenshot-packet").output, "appstore:screenshot-packet");
const xcodePacket = parseJsonOutput(run("appstore:xcode-packet").output, "appstore:xcode-packet");
const signoffTemplate = parseJsonOutput(run("appstore:signoff-template").output, "appstore:signoff-template");
const copyrightHolder = signoffTemplate.template["copyright-holder"];

const screens = [
  {
    screen: "App Information",
    status: "ready",
    fields: {
      name: connectPacket.appRecord.name,
      bundleId: connectPacket.appRecord.bundleId,
      sku: connectPacket.appRecord.sku,
      primaryLanguage: connectPacket.appRecord.primaryLanguage,
      category: connectPacket.appRecord.category,
      secondaryCategory: connectPacket.appRecord.secondaryCategory,
    },
  },
  {
    screen: "App Privacy",
    status: "ready",
    source: connectPacket.privacy.appPrivacyAnswers,
    fields: {
      privacyManifest: connectPacket.privacy.privacyManifest,
      privacyPolicyUrl: connectPacket.urls.privacyPolicy,
      currentAssumption: connectPacket.privacy.currentProductAssumption,
      dataCollected: privacyPacket.appStoreConnectAnswers.dataCollected,
      tracking: privacyPacket.appStoreConnectAnswers.tracking,
      dataLinkedToUser: privacyPacket.appStoreConnectAnswers.dataLinkedToUser,
      dataNotLinkedToUser: privacyPacket.appStoreConnectAnswers.dataNotLinkedToUser,
      manifestChecks: privacyPacket.manifestChecks,
    },
  },
  {
    screen: "Age Rating",
    status: "ready",
    source: connectPacket.appReview.ageRating.answers,
    fields: {
      expectedRating: connectPacket.appReview.ageRating.expectedRating,
      questionnaireDraft: connectPacket.appReview.ageRating.questionnaireDraft,
    },
  },
  {
    screen: "Version Information",
    status: "ready",
    fields: {
      version: connectPacket.release.marketingVersion,
      copyright: copyrightHolder,
      releaseType: connectPacket.release.releaseType,
      whatsNew: connectPacket.appStoreListing.whatsNew,
      promotionalText: connectPacket.appStoreListing.promotionalText,
      description: connectPacket.appStoreListing.description,
      keywords: connectPacket.appStoreListing.keywords,
      supportUrl: connectPacket.urls.support,
    },
  },
  {
    screen: "Build",
    status: xcodePacket.readyForArchive ? "ready-after-upload" : "manual",
    command: "npm run appstore:xcode-packet",
    fields: {
      expectedBuild: `${connectPacket.release.marketingVersion} (${connectPacket.release.buildNumber})`,
      bundleId: connectPacket.appRecord.bundleId,
      readyForArchive: xcodePacket.readyForArchive,
      selectedDeveloperPath: xcodePacket.xcode.selectedDeveloperPath,
    },
    manualActions: xcodePacket.manualActions,
  },
  {
    screen: "Screenshots",
    status: screenshotPacket.ready ? "ready-for-review" : "manual",
    command: "npm run appstore:screenshot-packet",
    fields: {
      finalReviewRequired: true,
      profiles: screenshotPacket.profiles.map((profile) => ({
        key: profile.key,
        expectedSize: profile.expectedSize,
        ready: profile.ready,
        fileCount: profile.files.length,
      })),
    },
  },
  {
    screen: "App Review Information",
    status: "ready",
    source: "docs/app-store-review-answers.md",
    fields: {
      signInRequired: connectPacket.appReview.signInRequired,
      demoAccountRequired: connectPacket.appReview.demoAccountRequired,
      notes: connectPacket.appReview.notes,
      contentRights: connectPacket.appReview.contentRights,
      exportCompliance: connectPacket.appReview.exportCompliance,
    },
  },
  {
    screen: "TestFlight",
    status: "manual-after-upload",
    source: connectPacket.testFlight.checklist,
    fields: {
      notes: connectPacket.testFlight.notes,
      finalEvidenceKeys: signoffTemplate.sourcePackets.testflight.evidenceFields,
    },
  },
  {
    screen: "Final Signoff",
    status: connectPacket.releaseGate.todo === 0 ? "ready" : "manual",
    command: "npm run appstore:signoff-template",
    fields: {
      todo: connectPacket.releaseGate.todo,
      todoItems: connectPacket.releaseGate.todoItems.map((item) => item.title),
      inputTemplate: signoffTemplate.saveAs,
      applyCommand: signoffTemplate.applyCommand,
      readyCommand: signoffTemplate.readyCommand,
    },
  },
];

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Screen-by-screen App Store Connect submission checklist for Charm ID.",
  sourcePacket: "npm run appstore:connect-packet",
  release: connectPacket.release,
  appRecord: connectPacket.appRecord,
  screens,
  remainingManualScreens: screens
    .filter((screen) => screen.status.startsWith("manual"))
    .map((screen) => screen.screen),
  finalGate: {
    statusCommand: connectPacket.releaseGate.command,
    strictCommand: connectPacket.releaseGate.strictCommand,
    todo: connectPacket.releaseGate.todo,
  },
};

console.log(JSON.stringify(packet, null, 2));
