import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";
import { checkWindowsSourceLocation } from "../scripts/check-windows-source-location.mjs";
import { checkStandaloneBoundary } from "../scripts/check-standalone-boundary.mjs";
import { resolveWslPath } from "../packages/tui/src/host/wsl-path.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const windowsPath = String.raw`D:\Users\demo\Documents\Screen shots\截图.png`;
describe.skipIf(process.platform !== "win32")("Windows Talos source contract", () => {
  it("accepts the actual checkout only after local NTFS verification", () => {
    assert.deepEqual(checkWindowsSourceLocation(), { ok: true, skipped: false });
  });
  it("preserves Windows path syntax on the native host", async () => {
    assert.equal(await resolveWslPath(windowsPath), windowsPath);
  });
  it("keeps retired installer paths out of the actual build graph", () => {
    checkStandaloneBoundary(JSON.parse(readFileSync(path.join(root, "dist", "metafile.json"), "utf8")));
  });
  it("does not install or activate updates in a complex source path", () => {
    const fixture = mkdtempSync(path.join(tmpdir(), "talos-no-installer-"));
    try {
      const cwd = path.join(fixture, "用户 files & (test)");
      mkdirSync(cwd);
      const marker = path.join(cwd, "current");
      writeFileSync(marker, "fixture-original");
      const env = { ...process.env, HOME: cwd, USERPROFILE: cwd, MINIMAX_DATA_DIR: path.join(cwd, "data"),
        MAVIS_DATA_DIR: path.join(cwd, "data"), MCODE_UPDATE_PREFIX: cwd, HTTP_PROXY: "", HTTPS_PROXY: "", ALL_PROXY: "" };
      delete env.NODE_OPTIONS;
      const result = spawnSync(process.execPath, [path.join(root, "dist", "cli.js"), "update"],
        { cwd, env, encoding: "utf8", timeout: 15000, windowsHide: true });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Talos does not install updates automatically/);
      assert.match(result.stdout, /no Talos npm update source configured/);
      assert.equal(readFileSync(marker, "utf8"), "fixture-original");
      assert.deepEqual(readdirSync(cwd), ["current"], "No installer state or prefix artifacts");
      assert.equal(existsSync(path.join(cwd, "versions")), false);
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  });
});
