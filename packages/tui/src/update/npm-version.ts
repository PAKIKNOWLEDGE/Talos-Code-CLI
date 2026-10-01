import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export interface TalosNpmIdentity { readonly name: string; readonly version: string }
export type TalosNpmStatus =
  | { readonly kind: "unconfigured" }
  | { readonly kind: "unconfirmed"; readonly message: string }
  | { readonly kind: "current"; readonly identity: TalosNpmIdentity; readonly latestVersion: string }
  | { readonly kind: "available"; readonly identity: TalosNpmIdentity; readonly latestVersion: string; readonly command: string };

export const TALOS_UNCONFIGURED_NPM_MESSAGE = "This build has no Talos npm update source configured. Use the current source build; Talos does not install updates automatically.";
const packagePattern = /^(?:@[a-z0-9][a-z0-9._-]*[/])?[a-z0-9][a-z0-9._-]*$/;
function parsedVersion(version: string): { numbers: readonly bigint[]; prerelease: boolean } | undefined {
  const match = /^(0|[1-9][0-9]*)[.](0|[1-9][0-9]*)[.](0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?(?:[+]([0-9A-Za-z.-]+))?$/.exec(version);
  if (!match) return undefined;
  if ([match[4], match[5]].some((part) => part?.split(".").some((id) => !id))) return undefined;
  if (match[4]?.split(".").some((id) => /^[0-9]+$/.test(id) && id.length > 1 && id[0] === "0")) return undefined;
  return { numbers: [BigInt(match[1]!), BigInt(match[2]!), BigInt(match[3]!)], prerelease: Boolean(match[4]) };
}
export function validTalosNpmIdentity(value: unknown): value is TalosNpmIdentity {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.name === "string" && data.name.length <= 214 && packagePattern.test(data.name) &&
    data.name !== "@minimax-ai/code" && data.name !== "@minimax/code" && !data.name.includes("..") &&
    typeof data.version === "string" && data.version.length <= 128 && Boolean(parsedVersion(data.version));
}

// The bundled import.meta.url points to cli.js. Source/private builds stay offline.
export function readTalosNpmIdentity(entryUrl = import.meta.url): TalosNpmIdentity | undefined {
  let directory = dirname(fileURLToPath(entryUrl));
  for (let depth = 0; depth < 8; depth++) {
    try {
      const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8")) as Record<string, unknown>;
      if (manifest.bin && typeof manifest.bin === "object" && "talos" in manifest.bin) {
        return manifest.private === false && validTalosNpmIdentity(manifest) ? { name: manifest.name, version: manifest.version } : undefined;
      }
    } catch { /* Keep walking within the bounded module ancestry. */ }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return undefined;
}

const inFlight = new Map<string, Promise<TalosNpmStatus>>();
export function checkTalosNpmVersion(options: {
  readonly identity?: TalosNpmIdentity | null;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
} = {}): Promise<TalosNpmStatus> {
  const identity = options.identity === undefined ? readTalosNpmIdentity() : options.identity;
  if (!validTalosNpmIdentity(identity)) return Promise.resolve({ kind: "unconfigured" });
  const key = `${identity.name}@${identity.version}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const work = (async (): Promise<TalosNpmStatus> => {
    try {
      const result = await Promise.race([
        (async () => {
          const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(identity.name)}/latest`, { signal: controller.signal, redirect: "error" });
          if (!response.ok) throw new Error(`npm metadata returned HTTP ${response.status}`);
          const data: unknown = await response.json();
          if (!validTalosNpmIdentity(data) || data.name !== identity.name) throw new Error("npm metadata identity or version was invalid");
          const latest = parsedVersion(data.version)!;
          const current = parsedVersion(identity.version)!;
          if (latest.prerelease) throw new Error("The latest tag did not report a stable release");
          let newer = false;
          let equal = true;
          for (let index = 0; index < 3; index++) {
            if (latest.numbers[index] !== current.numbers[index]) {
              newer = latest.numbers[index]! > current.numbers[index]!; equal = false; break;
            }
          }
          newer ||= equal && current.prerelease;
          return newer
            ? { kind: "available" as const, identity, latestVersion: data.version, command: `npm install --global ${identity.name}@latest` }
            : { kind: "current" as const, identity, latestVersion: data.version };
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error("npm metadata request timed out")); }, options.timeoutMs ?? 5000); }),
      ]);
      return result;
    } catch (error) {
      return { kind: "unconfirmed", message: error instanceof Error ? error.message : "npm metadata could not be confirmed" };
    } finally { clearTimeout(timer!); }
  })();
  inFlight.set(key, work);
  void work.finally(() => { if (inFlight.get(key) === work) inFlight.delete(key); });
  return work;
}

export function formatTalosNpmStatus(status: TalosNpmStatus): string {
  switch (status.kind) {
    case "unconfigured": return TALOS_UNCONFIGURED_NPM_MESSAGE;
    case "unconfirmed": return `Talos update could not be confirmed: ${status.message}. No update was installed.`;
    case "current": return `Talos ${status.identity.version}: npm latest reports ${status.latestVersion}; no newer stable release is available.`;
    case "available": return `Talos ${status.latestVersion} is available (current ${status.identity.version}). Upgrade manually: ${status.command}. Talos does not install updates automatically.`;
  }
}
