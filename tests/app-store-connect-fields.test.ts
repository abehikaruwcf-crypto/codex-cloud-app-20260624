import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const repoRoot = process.cwd();

function runFieldsPacket() {
  const output = execFileSync("npm", ["run", "appstore:connect-fields"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const jsonStart = output.indexOf("{");

  assert.notEqual(jsonStart, -1, "connect fields output should include JSON");
  return JSON.parse(output.slice(jsonStart));
}

test("App Store Connect field copy map exposes screen and field values", () => {
  const packet = runFieldsPacket();
  const byField = new Map(packet.fields.map((item: { screen: string; field: string }) => [`${item.screen}:${item.field}`, item]));

  assert.equal(packet.purpose, "Flat App Store Connect field copy map for Charm ID submission.");
  assert.equal(packet.sourcePacket, "npm run appstore:submission-checklist");
  assert.ok(packet.counts.fields >= 30);
  assert.deepEqual(packet.requiredScreens, [
    "App Information",
    "Version Information",
    "App Privacy",
    "Age Rating",
    "Accessibility",
    "Build",
    "Screenshots",
    "App Review Information",
    "TestFlight",
  ]);
  assert.equal(byField.get("App Information:Bundle ID").value, "com.wcf.charmid");
  assert.equal(byField.get("Version Information:Keywords").value, "管理番号,小物,チャーム,アクセサリー,部品,在庫,カメラ,識別");
  assert.equal(byField.get("App Privacy:Data Collected").value, "No");
  assert.match(byField.get("App Review Information:Review notes").value, /Charm ID can be used without login/);
});

test("App Store Connect field copy map keeps manual blockers explicit", () => {
  const packet = runFieldsPacket();
  const blocked = packet.blockedFields.map((item: { field: string; manualBlocker: string | null }) => ({
    field: item.field,
    manualBlocker: item.manualBlocker,
  }));

  assert.ok(packet.counts.blocked >= 2);
  assert.ok(
    blocked.some((item) => item.field === "Copyright" && item.manualBlocker === "App Store copyright holder"),
    "copyright should remain blocked until final holder is filled",
  );
  assert.ok(
    blocked.some((item) => item.field === "Evidence fields" && item.manualBlocker === "Final App Review signoff"),
    "TestFlight evidence should remain blocked until final signoff",
  );
});
