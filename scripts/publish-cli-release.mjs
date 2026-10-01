import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { versionFromTag, cliReleaseTargets } from './lib/cli-release.mjs';

export function validateReleaseReports({ archive, reports, version, revision }) {
  const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
  assert.equal(readFileSync(`${archive}.sha256`, 'utf8'), `${sha256}  ${path.basename(archive)}\n`);
  for (const target of cliReleaseTargets) {
    const directory = path.join(reports, `cli-install-${target.os}-${target.node}`);
    const installation = JSON.parse(readFileSync(path.join(directory, 'package-install.json'), 'utf8'));
    const verification = JSON.parse(readFileSync(path.join(directory, 'verification.json'), 'utf8'));
    assert.equal(verification.status, 'PASS');
    assert.equal(verification.profile, 'package');
    assert.equal(verification.revision, revision);
    assert.equal(verification.gates.find(gate => gate.name === 'test:release-package')?.status, 'PASS');
    assert.equal(installation.status, 'PASS');
    assert.equal(installation.version, version);
    assert.equal(installation.revision, revision);
    assert.equal(installation.sha256, sha256);
    assert.equal(installation.platform, target.os.startsWith('ubuntu') ? 'linux' : 'darwin');
    assert.ok(installation.node === `v${target.node}` || installation.node.startsWith(`v${target.node}.`));
  }
  return sha256;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  throw new Error("The upstream GitHub publication path is retired for Talos. Prepare a reviewed Talos npm package and publish it explicitly; this script never uploads or publishes.");
}
