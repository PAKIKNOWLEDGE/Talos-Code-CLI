import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const LOCAL_NTFS_REQUIREMENT =
  "Windows source checkouts must be on a local NTFS volume. pnpm workspace links require NTFS junctions; FAT32/exFAT volumes and network shares are not supported. Keep cloud-synced folders outside the checkout.";

function fail(reason) {
  return { ok: false, reason: `${LOCAL_NTFS_REQUIREMENT} ${reason}` };
}

/**
 * Validate the Windows volume before pnpm attempts to create workspace links.
 *
 * The function is exported so the platform-specific policy can be tested without
 * requiring a Windows host. Non-Windows platforms are intentionally a no-op.
 */
export function checkWindowsSourceLocation({
  platform = process.platform,
  cwd = process.cwd(),
  execFile = execFileSync,
  allowNonFixed = process.env.GITHUB_ACTIONS === "true",
} = {}) {
  if (platform !== "win32") return { ok: true, skipped: true };

  const pathApi = platform === "win32" ? path.win32 : path;
  const root = pathApi.parse(pathApi.resolve(cwd)).root;
  if (!/^[a-z]:\\$/iu.test(root) || root.startsWith("\\\\")) {
    return fail("The checkout root is not a local drive-letter path.");
  }
  // `fsutil` accepts a drive letter more reliably than a root path with a
  // trailing backslash across Windows runner images.
  const volume = root.slice(0, 2);

  let fixed;
  let filesystem;
  try {
    const options = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true };
    const driveType = execFile("fsutil", ["fsinfo", "drivetype", volume], options);
    const volumeInfo = execFile("fsutil", ["fsinfo", "volumeinfo", volume], options);
    fixed = /(?:DRIVE_FIXED|Fixed Drive)(?:[.]?)(?:\r?\n|$)/iu.test(driveType.trim());
    filesystem = /[:：]\s*NTFS(?:\r?\n|$)/iu.test(volumeInfo) ? "NTFS" : undefined;
    if (!fixed || !filesystem) throw new Error("fsutil output requires structured verification");
  } catch {
    // WMI returns structured fields and works without fsutil volume privileges.
    // Query is read-only; a failed or incomplete result still fails closed.
    try {
      const shell = path.win32.join(process.env.SystemRoot ?? "C:/Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
      const output = execFile(shell, ["-NoProfile", "-NonInteractive", "-Command",
        "Get-CimInstance -ClassName Win32_LogicalDisk | Select-Object DeviceID,DriveType,FileSystem | ConvertTo-Json -Compress"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true, timeout: 10000 });
      const parsed = JSON.parse(output);
      const disks = Array.isArray(parsed) ? parsed : [parsed];
      const disk = disks.find((item) => item?.DeviceID?.toUpperCase() === volume.toUpperCase());
      if (!disk || typeof disk.DriveType !== "number" || typeof disk.FileSystem !== "string") {
        throw new Error("The checkout volume was not reported by Win32_LogicalDisk");
      }
      fixed = disk.DriveType === 3;
      filesystem = disk.FileSystem.toUpperCase();
    } catch (error) {
      const detail = error instanceof Error ? ` (${error.message})` : "";
      return fail(`Windows could not verify the checkout volume${detail}.`);
    }
  }
  if (!allowNonFixed && !fixed) return fail("The checkout volume is not a local fixed drive.");
  if (filesystem !== "NTFS") return fail("The checkout volume is not formatted as NTFS.");
  return { ok: true, skipped: false };
}

export function runWindowsSourceLocationCheck({
  platform = process.platform,
  cwd = process.cwd(),
  execFile = execFileSync,
  allowNonFixed = process.env.GITHUB_ACTIONS === "true",
  report = (message) => console.error(`[source-check] ${message}`),
} = {}) {
  const result = checkWindowsSourceLocation({ platform, cwd, execFile, allowNonFixed });
  if (!result.ok) report(result.reason);
  return result;
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (scriptPath === fileURLToPath(import.meta.url)) {
  const result = runWindowsSourceLocationCheck();
  if (!result.ok) process.exitCode = 1;
}
