import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { versionFromTag } from './lib/cli-release.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const version = versionFromTag(process.env.MCODE_RELEASE_TAG);
if (!process.env.MCODE_RELEASE_ARCHIVE) throw new Error('MCODE_RELEASE_ARCHIVE is required.');
if (!['win32', 'linux', 'darwin'].includes(process.platform)) throw new Error('Unsupported package validation platform.');
const packageName = process.env.TALOS_NPM_PACKAGE_NAME;
if (!packageName || !new RegExp("^(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$").test(packageName) || packageName === '@minimax-ai/code') throw new Error('Explicit Talos package identity is required.');
const archive = path.resolve(process.env.MCODE_RELEASE_ARCHIVE);
const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
assert.equal(readFileSync(`${archive}.sha256`, 'utf8'), `${sha256}  ${path.basename(archive)}\n`, 'Release archive checksum mismatch');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const temporary = mkdtempSync(path.join(tmpdir(), 'mcode-package-install-'));
try {
  // No global install or real user profile is modified. Dependencies and the
  // generated npm launcher must resolve from this fresh installation alone.
  const prefix = path.join(temporary, 'install');
  const home = path.join(temporary, 'home');
  mkdirSync(home);
  const env = {
    ...process.env, HOME: home, USERPROFILE: home,
    MINIMAX_DATA_DIR: path.join(home, 'data'), MAVIS_DATA_DIR: path.join(home, 'data'),
    MCODE_DISABLE_TELEMETRY: '1',
  };
  for (const name of Object.keys(env)) {
    if (/^npm_config_/i.test(name)) delete env[name];
  }
  Object.assign(env, {
    npm_config_cache: path.join(temporary, 'npm-cache'),
    npm_config_userconfig: path.join(home, '.npmrc'),
  });
  delete env.NODE_PATH;
  delete env.NODE_OPTIONS;
  const windows = process.platform === "win32";
  const npmCli = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  const npm = (...args) => execFileSync(process.execPath, [npmCli, ...args],
    { cwd: home, env, stdio: "inherit", timeout: 300000, windowsHide: true });
  npm("install", "--global", "--prefix", prefix, "--include=optional", "--ignore-scripts=false",
    "--allow-scripts=better-sqlite3", "--no-audit", "--no-fund", archive);
  const installed = path.join(prefix, ...(windows ? ["node_modules"] : ["lib", "node_modules"]), ...packageName.split("/"));
  const installedManifest = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"));
  assert.equal(installedManifest.name, packageName);
  assert.deepEqual(installedManifest.bin, { talos: "cli.js" });
  assert.equal(existsSync(path.join(installed, "embedded", "mcode-tools")), false);
  assert.equal(existsSync(path.join(installed, "internal-bin")), false);
  const release = JSON.parse(readFileSync(path.join(installed, 'release.json'), 'utf8'));
  assert.equal(release.version, version);
  assert.equal(release.tag, process.env.MCODE_RELEASE_TAG);
  assert.equal(release.revision, revision);
  const launcher = path.join(prefix, ...(windows ? [] : ["bin"]), windows ? "talos.cmd" : "talos");
  assert.equal(existsSync(launcher), true, "npm generated launcher is present");
  const versionArgs = windows
    ? ["/d", "/s", "/c", `"${launcher}" --version`]
    : ["--version"];
  const executable = windows ? process.env.ComSpec ?? "C:/Windows/System32/cmd.exe" : launcher;
  const result = execFileSync(executable, versionArgs, { cwd: home, env, encoding: "utf8", timeout: 30000, windowsHide: true });
  assert.equal(result.trim(), version);
  const require = createRequire(path.join(installed, 'package.json'));
  const Database = require('better-sqlite3');
  const db = new Database(':memory:');
  try { assert.equal(db.prepare('select 42 as value').get().value, 42); } finally { db.close(); }
  assert.match(execFileSync(require('@vscode/ripgrep').rgPath, ['--version'], { encoding: 'utf8' }), /ripgrep/);
  execFileSync(process.execPath, ['--test', 'test/smoke.test.mjs', 'test/byok.test.mjs'], {
    cwd: root, env: { ...env, MCODE_TEST_CLI: path.join(installed, 'cli.js') }, stdio: 'inherit', timeout: 240000,
  });
  // Reinstall the same candidate to exercise prefix replacement, then uninstall.
  // Cross-version upgrade needs a second version and is not claimed here.
  npm("install", "--global", "--prefix", prefix, "--include=optional", "--ignore-scripts=false",
    "--allow-scripts=better-sqlite3", "--no-audit", "--no-fund", archive);
  assert.equal(JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8")).version, version);
  npm("uninstall", "--global", "--prefix", prefix, "--no-audit", "--no-fund", packageName);
  assert.equal(existsSync(installed), false);
  assert.equal(existsSync(launcher), false);
  if (process.env.MCODE_VERIFY_REPORT_DIR) {
    mkdirSync(process.env.MCODE_VERIFY_REPORT_DIR, { recursive: true });
    writeFileSync(path.join(process.env.MCODE_VERIFY_REPORT_DIR, 'package-install.json'), JSON.stringify({
      status: 'PASS', packageName, version, revision, sha256, reinstall: true, uninstall: true, crossVersionUpgrade: false, platform: process.platform, arch: process.arch, node: process.version,
    }, null, 2) + '\n');
  }
  console.log(`Verified npm installation of ${path.basename(archive)} (${sha256}).`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
