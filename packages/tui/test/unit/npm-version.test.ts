import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkTalosNpmVersion, formatTalosNpmStatus, readTalosNpmIdentity } from "../../src/update/npm-version.js";
import { TuiUpdateFlow } from "../../src/tui/controller/product/update-flow.js";

const identity = { name: "@fixture/talos-cli", version: "1.2.3" };
const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
const response = (version: string, name = identity.name) => new Response(JSON.stringify({ name, version }), { status: 200 });

describe("Talos read-only npm updates", () => {
  it("keeps source/private or missing identity offline", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    expect((await checkTalosNpmVersion({ identity: null, fetchImpl })).kind).toBe("unconfigured");
    expect(fetchImpl).not.toHaveBeenCalled();
    const directory = await mkdtemp(join(tmpdir(), "talos-npm-identity-")); dirs.push(directory);
    const manifest = { ...identity, bin: { talos: "cli.js" }, private: true };
    await writeFile(join(directory, "package.json"), JSON.stringify(manifest), "utf8");
    expect(readTalosNpmIdentity(pathToFileURL(join(directory, "cli.js")).href)).toBeUndefined();
    await writeFile(join(directory, "package.json"), JSON.stringify({ ...manifest, private: false }), "utf8");
    expect(readTalosNpmIdentity(pathToFileURL(join(directory, "cli.js")).href)).toEqual(identity);
  });
  it.each(["1.2.4", "1.10.0", "2.0.0"])("reports newer %s and exact manual command", async (version) => {
    const fetchImpl = vi.fn<typeof fetch>(async () => response(version));
    const result = await checkTalosNpmVersion({ identity, fetchImpl });
    expect(result).toMatchObject({ kind: "available", latestVersion: version, command: "npm install --global @fixture/talos-cli@latest" });
    expect(fetchImpl).toHaveBeenCalledWith("https://registry.npmjs.org/%40fixture%2Ftalos-cli/latest", expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }));
    expect(formatTalosNpmStatus(result)).toContain("does not install updates automatically");
  });
  it.each(["1.2.3", "1.2.2", "1.1.9"])("does not offer downgrade for %s", async (version) => {
    expect((await checkTalosNpmVersion({ identity, fetchImpl: async () => response(version) })).kind).toBe("current");
  });
  it("treats stable version as newer than its matching prerelease", async () => {
    expect((await checkTalosNpmVersion({ identity: { ...identity, version: "1.2.3-rc.1" }, fetchImpl: async () => response("1.2.3") })).kind).toBe("available");
  });
  it.each(["1.2.4-rc.1", "01.2.4", "invalid"])("does not treat invalid latest %s as confirmed", async (version) => {
    expect((await checkTalosNpmVersion({ identity, fetchImpl: async () => response(version) })).kind).toBe("unconfirmed");
  });
  it.each(["@minimax-ai/code", "@minimax/code", "@fixture/bad;cmd", "@fixture/../escape"])("never queries rejected identity %s", async (name) => {
    const fetchImpl = vi.fn<typeof fetch>();
    expect((await checkTalosNpmVersion({ identity: { name, version: "1.2.3" }, fetchImpl })).kind).toBe("unconfigured");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("rejects mismatched metadata and fetch failure", async () => {
    expect((await checkTalosNpmVersion({ identity, fetchImpl: async () => response("9.0.0", "@other/package") })).kind).toBe("unconfirmed");
    expect((await checkTalosNpmVersion({ identity, fetchImpl: async () => { throw new Error("offline"); } })).kind).toBe("unconfirmed");
    expect((await checkTalosNpmVersion({ identity, fetchImpl: async () => new Response("{}", { status: 404 }) })).kind).toBe("unconfirmed");
  });
  it("times out even when the injected transport ignores abort", async () => {
    const result = await checkTalosNpmVersion({ identity, timeoutMs: 10, fetchImpl: () => new Promise<Response>(() => undefined) });
    expect(result).toMatchObject({ kind: "unconfirmed", message: expect.stringContaining("timed out") });
    expect(formatTalosNpmStatus(result)).not.toContain("no newer stable");
  });
  it("coalesces concurrent actions and allows a fresh later request", async () => {
    let finish!: (value: Response) => void;
    const fetchImpl = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => { finish = resolve; }));
    const first = checkTalosNpmVersion({ identity, fetchImpl });
    const second = checkTalosNpmVersion({ identity, fetchImpl });
    expect(first).toBe(second); expect(fetchImpl).toHaveBeenCalledOnce();
    finish(response("1.2.4")); await first;
    const next = checkTalosNpmVersion({ identity, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2); finish(response("1.2.4")); await next;
  });
  it("presents manual-only details and ignores late results after stop", async () => {
    const append = vi.fn();
    const flow = new TuiUpdateFlow(append, () => Promise.resolve({ kind: "available", identity, latestVersion: "1.2.4", command: "npm install --global @fixture/talos-cli@latest" }));
    await flow.show();
    expect(append).toHaveBeenCalledWith(expect.stringContaining("Upgrade manually"), "warning");
    let finish!: (value: { kind: "unconfigured" }) => void;
    const lateAppend = vi.fn();
    const late = new TuiUpdateFlow(lateAppend, () => new Promise((resolve) => { finish = resolve; }));
    const showing = late.show(); late.stop(); finish({ kind: "unconfigured" }); await showing;
    expect(lateAppend).not.toHaveBeenCalled();
  });
});
