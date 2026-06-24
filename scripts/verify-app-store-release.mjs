import { execFileSync } from "node:child_process";

const strict = process.argv.includes("--strict");

const requiredCommands = [
  {
    name: "Backup fixture validation",
    command: "npm",
    args: ["run", "backup:validate", "--", "tests/fixtures/valid-backup.json"],
  },
  { name: "Unit tests", command: "npm", args: ["run", "test:unit"] },
  { name: "Metadata export", command: "npm", args: ["run", "appstore:metadata"] },
  { name: "Public URL verification", command: "npm", args: ["run", "appstore:public-urls"] },
  { name: "Release evidence report", command: "npm", args: ["run", "appstore:evidence"] },
  { name: "App Store audit", command: "npm", args: ["run", "appstore:audit"] },
  { name: "iOS sync", command: "npm", args: ["run", "ios:sync"] },
];

const statusCommand = {
  name: "Release status",
  command: "npm",
  args: ["run", "appstore:status"],
};

function runStep(step, options = { allowFailure: false }) {
  console.log(`\n== ${step.name} ==`);

  try {
    const output = execFileSync(step.command, step.args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    console.log(output.trim());
    return { ok: true, output };
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    console.log(output);

    if (!options.allowFailure) {
      process.exitCode = 1;
    }

    return { ok: false, output };
  }
}

for (const command of requiredCommands) {
  runStep(command);
}

const status = runStep(statusCommand, { allowFailure: !strict });

console.log("\n== Verification summary ==");
if (process.exitCode) {
  console.log("Hard release verification failed.");
} else if (!status.ok) {
  console.log("Hard release verification passed; App Review TODOs remain.");
  console.log("Run `npm run appstore:verify -- --strict` only after appstore:status reports 0 todo.");
} else {
  console.log("Release verification passed with 0 App Review TODOs.");
}
