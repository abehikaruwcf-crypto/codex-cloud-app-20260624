import { execFileSync } from "node:child_process";

const requiredSteps = [
  {
    name: "Metadata",
    script: "appstore:metadata",
    expected: ['"bundleId": "com.wcf.charmid"', '"primaryLanguage": "Japanese"'],
  },
  {
    name: "App Store Connect transfer packet",
    script: "appstore:connect-packet",
    expected: [
      '"privacyPolicy": "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/privacy.html"',
      '"support": "https://abehikaruwcf-crypto.github.io/codex-cloud-app-20260624/support.html"',
      '"todo": 4',
    ],
  },
  {
    name: "Age rating answers",
    script: "appstore:rating",
    expected: ['"expectedRating": "4+"', "Camera: Yes"],
  },
  {
    name: "Accessibility answers",
    script: "appstore:accessibility",
    expected: ['"sourceDoc": "docs/app-accessibility-answers.md"', "Do not claim yet"],
  },
  {
    name: "Screenshot evidence packet",
    script: "appstore:screenshot-packet",
    expected: ['"sourceDoc": "docs/app-store-screenshots.md"', '"generationCommand"', '"profiles"'],
  },
  {
    name: "TestFlight evidence packet",
    script: "appstore:testflight-packet",
    expected: ['"sourceDoc": "docs/testflight-release-checklist.md"', '"backupValidationCommand"', '"signoffCommandFragment"'],
  },
  {
    name: "Public URL verification",
    script: "appstore:public-urls",
    expected: ["Public App Store URLs are reachable."],
  },
  {
    name: "App Review signoff draft",
    script: "appstore:signoff-draft",
    expected: ["App Review Signoff Draft", "App Store status:"],
  },
  {
    name: "Final signoff apply command",
    script: "appstore:signoff-command",
    expected: ['"replacePlaceholdersBeforeUse"', "npm run appstore:apply-inputs", "--mark-ready"],
  },
];

function runScript(script) {
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

function compactOutput(output) {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const usefulLine =
    lines.find((line) => line.includes("Public App Store URLs are reachable.")) ??
    lines.find((line) => line.startsWith("Status summary:")) ??
    lines.find((line) => line.startsWith("App Store status:")) ??
    lines.find((line) => line.includes('"bundleId":')) ??
    lines.find((line) => line.includes('"expectedRating":')) ??
    lines.find((line) => line.includes('"sourceDoc":'));

  return usefulLine ?? lines.at(-1) ?? "";
}

function parseStatus(output) {
  const statusMatch = output.match(/Status summary:\s*(\d+)\s+pass,\s*(\d+)\s+todo/i);
  const todoItems = [];
  for (const line of output.split("\n")) {
    const match = line.match(/^\[TODO\]\s+([^:]+):\s*(.+)$/);
    if (match) {
      todoItems.push({ title: match[1], detail: match[2] });
    }
  }

  return {
    pass: statusMatch ? Number(statusMatch[1]) : null,
    todo: statusMatch ? Number(statusMatch[2]) : null,
    todoItems,
  };
}

const steps = requiredSteps.map((step) => {
  const result = runScript(step.script);
  const missingExpected = step.expected.filter((needle) => !result.output.includes(needle));

  return {
    name: step.name,
    command: `npm run ${step.script}`,
    ok: result.ok && missingExpected.length === 0,
    summary: compactOutput(result.output),
    missingExpected,
  };
});

const releaseStatusResult = runScript("appstore:status");
const releaseStatus = parseStatus(releaseStatusResult.output);
const hardFailures = steps.filter((step) => !step.ok);

const preflight = {
  generatedAt: new Date().toISOString(),
  release: {
    appName: "Charm ID",
    bundleId: "com.wcf.charmid",
    target: "App Store submission",
  },
  commands: {
    preflight: "npm run appstore:preflight",
    hardGate: "npm run appstore:verify",
    strictGate: "npm run appstore:verify -- --strict",
    status: "npm run appstore:status",
    screenshotPacket: "npm run appstore:screenshot-packet",
    testflightPacket: "npm run appstore:testflight-packet",
    signoffCommand: "npm run appstore:signoff-command",
  },
  steps,
  releaseStatus: {
    ok: releaseStatusResult.ok,
    pass: releaseStatus.pass,
    todo: releaseStatus.todo,
    todoItems: releaseStatus.todoItems,
    expectedManualTodoCount: 4,
  },
  manualGate: {
    readyForAppReview: releaseStatusResult.ok && releaseStatus.todo === 0,
    remainingActions: releaseStatus.todoItems.map((item) => item.title),
    finalSignoffDoc: "docs/app-review-final-signoff.md",
  },
  sourceDocs: [
    "docs/app-store-submission-packet.md",
    "docs/app-store-metadata.md",
    "docs/app-store-review-answers.md",
    "docs/app-age-rating-answers.md",
    "docs/app-accessibility-answers.md",
    "docs/app-review-final-signoff.md",
  ],
};

console.log(JSON.stringify(preflight, null, 2));

if (hardFailures.length > 0) {
  process.exit(1);
}
