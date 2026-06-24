import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(command, args) {
  try {
    return {
      ok: true,
      output: execFileSync(command, args, {
        cwd: root,
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

function hasFile(path) {
  return existsSync(join(root, path));
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function packageScript(name) {
  if (!hasFile("package.json")) {
    return null;
  }

  return readJson("package.json").scripts?.[name] ?? null;
}

function commandSummary(command, args) {
  const result = run(command, args);
  return {
    command: [command, ...args].join(" "),
    ok: result.ok,
    output: result.output.split("\n")[0] ?? "",
  };
}

const node = commandSummary("node", ["--version"]);
const npm = commandSummary("npm", ["--version"]);
const git = commandSummary("git", ["--version"]);
const branch = commandSummary("git", ["branch", "--show-current"]);
const remote = run("git", ["remote", "get-url", "origin"]);
const status = run("git", ["status", "--short"]);
const xcodeSelect = run("xcode-select", ["-p"]);
const xcodebuild = run("xcodebuild", ["-version"]);
const fullXcodePath = "/Applications/Xcode.app";
const fullXcodeInstalled = existsSync(fullXcodePath);
const nodeModulesPresent = hasFile("node_modules/.package-lock.json") || hasFile("node_modules");
const packageLockPresent = hasFile("package-lock.json");
const packageJson = hasFile("package.json") ? readJson("package.json") : {};

const requiredScripts = [
  "dev",
  "build",
  "test:unit",
  "ios:sync",
  "appstore:status",
  "appstore:handoff",
  "appstore:xcode-packet",
  "appstore:audit",
  "appstore:verify",
];

const checks = [
  {
    key: "git-clean",
    ok: status.ok && status.output.length === 0,
    detail: status.ok && status.output.length === 0 ? "Working tree is clean." : status.output || "git status failed.",
    next: "Commit, stash, or inspect local changes before switching Macs.",
  },
  {
    key: "node",
    ok: node.ok,
    detail: node.output,
    next: "Install Node.js before running npm commands.",
  },
  {
    key: "npm",
    ok: npm.ok,
    detail: npm.output,
    next: "Install npm with Node.js before setup.",
  },
  {
    key: "package-lock",
    ok: packageLockPresent,
    detail: packageLockPresent ? "package-lock.json is present." : "package-lock.json is missing.",
    next: "Run npm install on a trusted checkout if dependencies need to be generated.",
  },
  {
    key: "dependencies",
    ok: nodeModulesPresent,
    detail: nodeModulesPresent ? "node_modules is present." : "node_modules is missing.",
    next: "Run npm install.",
  },
  {
    key: "ios-project",
    ok: hasFile("ios/App/App.xcodeproj/project.pbxproj"),
    detail: "ios/App/App.xcodeproj/project.pbxproj",
    next: "Run npm run ios:sync after dependencies are installed.",
  },
  {
    key: "full-xcode-installed",
    ok: fullXcodeInstalled,
    detail: fullXcodeInstalled ? fullXcodePath : `${fullXcodePath} is missing.`,
    next: "Install full Xcode from the Mac App Store.",
  },
  {
    key: "full-xcode-selected",
    ok: xcodeSelect.ok && xcodeSelect.output === `${fullXcodePath}/Contents/Developer`,
    detail: xcodeSelect.output || xcodeSelect.output,
    next: `Run sudo xcode-select -s ${fullXcodePath}/Contents/Developer after full Xcode is installed.`,
  },
  {
    key: "xcodebuild",
    ok: xcodebuild.ok && /^Xcode\s+\S+/m.test(xcodebuild.output),
    detail: xcodebuild.output.split("\n")[0] || "xcodebuild did not report full Xcode.",
    next: "Open Xcode once and accept any required license/components, then rerun this command.",
  },
  ...requiredScripts.map((name) => ({
    key: `script:${name}`,
    ok: Boolean(packageScript(name)),
    detail: packageScript(name) ?? "missing",
    next: `Restore package.json script ${name}.`,
  })),
];

const packet = {
  generatedAt: new Date().toISOString(),
  purpose: "Check whether this checkout is ready for Charm ID development, MacBook Pro handoff, and App Store release prep.",
  repository: {
    remote: remote.ok ? remote.output : null,
    branch: branch.ok ? branch.output : null,
    clean: status.ok && status.output.length === 0,
  },
  app: {
    packageName: packageJson.name ?? null,
    packageVersion: packageJson.version ?? null,
    bundleId: "com.wcf.charmid",
  },
  runtime: {
    node,
    npm,
    git,
  },
  xcode: {
    fullXcodePath,
    installed: fullXcodeInstalled,
    selectedDeveloperPath: xcodeSelect.output || null,
    versionOutput: xcodebuild.output,
  },
  checks,
  readyForWebDevelopment: checks.filter((check) =>
    ["node", "npm", "dependencies", "script:dev", "script:build", "script:test:unit"].includes(check.key),
  ).every((check) => check.ok),
  readyForAppStoreArchive: checks.filter((check) =>
    ["ios-project", "full-xcode-installed", "full-xcode-selected", "xcodebuild", "script:ios:sync", "script:appstore:verify"].includes(
      check.key,
    ),
  ).every((check) => check.ok),
  recommendedNextCommands: [
    "npm install",
    "npm run test:unit",
    "npm run appstore:status",
    "npm run appstore:handoff",
    "npm run appstore:verify",
  ],
  macBookProHandoff: "outputs/macbook-pro-handoff.md",
};

console.log(JSON.stringify(packet, null, 2));
