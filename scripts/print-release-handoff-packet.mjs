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

function parseStatus(output) {
  const summary = output.match(/Status summary:\s*(\d+)\s+pass,\s*(\d+)\s+todo/i);
  const todoItems = [];

  for (const line of output.split("\n")) {
    const match = line.match(/^\[TODO\]\s+([^:]+):\s*(.+)$/);
    if (match) {
      todoItems.push({ title: match[1], detail: match[2] });
    }
  }

  return {
    pass: summary ? Number(summary[1]) : null,
    todo: summary ? Number(summary[2]) : todoItems.length,
    todoItems,
  };
}

const statusResult = run("appstore:status");
const status = parseStatus(statusResult.output);
const signoffTemplate = parseJsonOutput(run("appstore:signoff-template").output, "appstore:signoff-template");
const submissionChecklist = parseJsonOutput(run("appstore:submission-checklist").output, "appstore:submission-checklist");
const xcodePacket = parseJsonOutput(run("appstore:xcode-packet").output, "appstore:xcode-packet");
const testflightPacket = parseJsonOutput(run("appstore:testflight-packet").output, "appstore:testflight-packet");
const privacyPacket = parseJsonOutput(run("appstore:privacy").output, "appstore:privacy");

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Manual handoff packet for moving Charm ID from current release prep to 0 App Review TODOs.",
  release: {
    appName: "Charm ID",
    bundleId: "com.wcf.charmid",
    version: submissionChecklist.release.marketingVersion,
    build: submissionChecklist.release.buildNumber,
  },
  currentGate: {
    command: "npm run appstore:status",
    pass: status.pass,
    todo: status.todo,
    todoItems: status.todoItems,
  },
  requiredManualWork: [
    {
      owner: "Release owner",
      title: "Finalize legal/contact release inputs",
      blocks: ["Formal support contact", "Privacy policy contact", "App Store copyright holder"],
      inputs: ["support-contact", "privacy-contact", "copyright-holder"],
      sourceCommand: "npm run appstore:signoff-template",
    },
    {
      owner: "Xcode/App Store Connect operator",
      title: "Archive and upload release build",
      blocks: ["Full Xcode selected", "Final App Review signoff"],
      inputs: xcodePacket.signoffFields.map((field) => field.key),
      sourceCommand: "npm run appstore:xcode-packet",
      readyForArchive: xcodePacket.readyForArchive,
    },
    {
      owner: "QA tester",
      title: "Run physical iPhone TestFlight validation",
      blocks: ["Final App Review signoff"],
      inputs: testflightPacket.evidenceFields.map((field) => field.key),
      sourceCommand: "npm run appstore:testflight-packet",
    },
    {
      owner: "App Store Connect operator",
      title: "Enter App Store Connect listing, privacy, age rating, and review answers",
      blocks: ["Final App Review signoff"],
      screens: submissionChecklist.screens.map((screen) => screen.screen),
      privacyAnswers: privacyPacket.appStoreConnectAnswers,
      sourceCommand: "npm run appstore:submission-checklist",
    },
  ],
  releaseInputs: {
    saveAs: signoffTemplate.saveAs,
    applyCommand: signoffTemplate.applyCommand,
    readyCommand: signoffTemplate.readyCommand,
    placeholders: signoffTemplate.placeholders,
    template: signoffTemplate.template,
  },
  verification: [
    "npm run appstore:apply-inputs -- --inputs-file release-inputs.json",
    "npm run appstore:status",
    "npm run appstore:evidence-check",
    "npm run appstore:verify",
    "npm run appstore:verify -- --strict",
  ],
};

console.log(JSON.stringify(packet, null, 2));
