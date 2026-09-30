import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  getTuiDataDirPath,
  prepareTuiDataDir,
  resolveDefaultTuiDataDir,
} from '../../src/runtime/data-dir.js';

describe('TUI data directory', () => {
  it.each(['dev', 'test', 'staging', 'prod'] as const)(
    'uses the Talos user directory for %s builds',
    (buildEnv) => {
      expect(resolveDefaultTuiDataDir(buildEnv, () => '/fake-home', () => null)).toBe(
        join('/fake-home', '.talos'),
      );
    },
  );

  it('keeps the Talos profile suffix', () => {
    expect(resolveDefaultTuiDataDir('prod', () => '/fake-home', () => 'smoke')).toBe(
      join('/fake-home', '.talos-smoke'),
    );
  });

  it.each([
    [{}, '/default'],
    [{ MINIMAX_DATA_DIR: '  ', MAVIS_DATA_DIR: ' ' }, '/default'],
    [{ MINIMAX_DATA_DIR: ' /public ', MAVIS_DATA_DIR: '/legacy' }, '/public'],
    [{ MINIMAX_DATA_DIR: ' ', MAVIS_DATA_DIR: ' /legacy ' }, '/legacy'],
  ])('preserves override precedence for %j', (environment, expected) => {
    expect(getTuiDataDirPath(environment, () => '/default')).toBe(expected);
  });

  it('passes the selected directory to runtime initialization', async () => {
    const configureRuntimeEnvironment = vi.fn();
    await expect(prepareTuiDataDir({
      environment: { MINIMAX_DATA_DIR: ' /selected ' },
      getBuildEnv: () => 'prod',
      configureRuntimeEnvironment,
    })).resolves.toBe('/selected');
    expect(configureRuntimeEnvironment).toHaveBeenCalledWith({ dataDir: '/selected' });
  });
});
