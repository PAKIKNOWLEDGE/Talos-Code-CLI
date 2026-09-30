import { describe, expect, it, vi } from 'vitest';

import { McodePluginApplication } from '../../src/plugin/application.js';
import { runMcodePluginCommand } from '../../src/cli/plugin-command.js';

const plugin = (name: string, marketplace: 'official' | 'local', installed: boolean) => ({
  pluginId: `${name}@${marketplace}`,
  name,
  displayName: name,
  marketplace,
  installed,
  enabled: installed,
  capabilities: { appCount: 0, mcpServerCount: 0, skillCount: 1 },
});

describe('McodePluginApplication', () => {
  it.each([false, true])('uses only the local source in neutral catalogs (includeAvailable=%s)', async (includeAvailable) => {
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
    try {
      const local = plugin('notes', 'local', true);
      const candidate = plugin('draft', 'local', false);
      const old = plugin('old', 'official', true);
      const port = { listInstalledPlugins: vi.fn(async () => [local, old]),
        listMarketplacePlugins: vi.fn(async () => [candidate, old]) };
      const application = new McodePluginApplication(port as never);
      await expect(application.catalog({ includeAvailable })).resolves.toEqual({
        installed: [local], available: includeAvailable ? [candidate] : [],
      });
      expect(port.listInstalledPlugins).toHaveBeenCalledWith({ marketplace: 'local' });
      if (includeAvailable) expect(port.listMarketplacePlugins).toHaveBeenCalledExactlyOnceWith({ marketplace: 'local' });
      else expect(port.listMarketplacePlugins).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });

  it('rejects explicit official queries and mutations without calling the Runtime in neutral mode', async () => {
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
    try {
      const port = { listInstalledPlugins: vi.fn(), listMarketplacePlugins: vi.fn(), mutatePlugin: vi.fn() };
      const application = new McodePluginApplication(port as never);
      const official = plugin('old', 'official', true);
      await expect(application.catalog({ includeAvailable: true, marketplace: 'official' })).rejects.toThrow('unavailable in Talos');
      await expect(application.install(official)).rejects.toThrow('unavailable in Talos');
      await expect(application.remove(official)).rejects.toThrow('unavailable in Talos');
      await expect(application.setEnabled(official, true)).rejects.toThrow('unavailable in Talos');
      expect(port.listInstalledPlugins).not.toHaveBeenCalled();
      expect(port.listMarketplacePlugins).not.toHaveBeenCalled();
      expect(port.mutatePlugin).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });

  it('retains local install, enable/disable, removal and refresh operations in neutral mode', async () => {
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
    try {
      const port = { mutatePlugin: vi.fn(async () => ({ installed: true, enabled: true })),
        refreshPlugins: vi.fn(async () => undefined) };
      const application = new McodePluginApplication(port as never);
      const local = plugin('notes', 'local', false);
      await application.install(local); await application.setEnabled(local, true);
      await application.setEnabled(local, false); await application.remove(local); await application.refresh();
      expect(port.mutatePlugin.mock.calls.map(([request]) => request)).toEqual([
        { action: 'install', plugin: { name: 'notes', marketplace: 'local' } },
        { action: 'enable', plugin: { name: 'notes', marketplace: 'local' } },
        { action: 'disable', plugin: { name: 'notes', marketplace: 'local' } },
        { action: 'remove', plugin: { name: 'notes', marketplace: 'local' } },
      ]);
      expect(port.refreshPlugins).toHaveBeenCalledOnce();
    } finally { vi.unstubAllEnvs(); }
  });

  it('lists only the local CLI marketplace and describes local refresh in neutral mode', async () => {
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
    try {
      const application = { refresh: vi.fn(async () => undefined) };
      const shutdown = vi.fn(async () => undefined);
      const createContext = async () => ({ application: application as never, dataDir: '/synthetic/data', shutdown });
      const sources = JSON.parse(await runMcodePluginCommand({ version: '0.5.7',
        request: { action: 'marketplace-list', json: true }, createContext }));
      expect(sources).toHaveLength(1); expect(sources[0]).toMatchObject({ name: 'local', kind: 'directory' });
      await expect(runMcodePluginCommand({ version: '0.5.7',
        request: { action: 'marketplace-upgrade' }, createContext })).resolves.toBe('Refreshed local Plugin sources.');
      expect(application.refresh).toHaveBeenCalledOnce(); expect(shutdown).toHaveBeenCalledTimes(2);
    } finally { vi.unstubAllEnvs(); }
  });

  it('partitions installed and available Plugins across the real Runtime sources', async () => {
    const port = {
      listInstalledPlugins: vi.fn(async () => [plugin('legacy', 'official', true)]),
      listMarketplacePlugins: vi
        .fn()
        .mockResolvedValueOnce([plugin('docs', 'official', false)])
        .mockResolvedValueOnce([plugin('notes', 'local', false)]),
    };
    const application = new McodePluginApplication(port as never);

    await expect(application.catalog({ includeAvailable: true })).resolves.toEqual({
      installed: [plugin('legacy', 'official', true)],
      available: [plugin('docs', 'official', false), plugin('notes', 'local', false)],
    });
    expect(port.listMarketplacePlugins).toHaveBeenNthCalledWith(1, {
      marketplace: 'official',
    });
    expect(port.listMarketplacePlugins).toHaveBeenNthCalledWith(2, {
      marketplace: 'local',
    });
    expect(port.listInstalledPlugins).toHaveBeenCalledWith({ marketplace: undefined });
  });

  it('applies mutations through the Runtime owner and returns the committed state', async () => {
    const selected = plugin('docs', 'official', false);
    const port = {
      mutatePlugin: vi
        .fn()
        .mockResolvedValueOnce({ installed: true, enabled: true })
        .mockResolvedValueOnce({ installed: true, enabled: false })
        .mockResolvedValueOnce({ installed: false, enabled: false }),
      refreshPlugins: vi.fn(async () => undefined),
    };
    const application = new McodePluginApplication(port as never);

    const installed = await application.install(selected);
    await expect(application.setEnabled(installed, false)).resolves.toMatchObject({
      installed: true,
      enabled: false,
    });
    await expect(application.remove(installed)).resolves.toMatchObject({
      installed: false,
      enabled: false,
    });
    await expect(application.refresh()).resolves.toBeUndefined();

    expect(port.mutatePlugin).toHaveBeenNthCalledWith(1, {
      action: 'install',
      plugin: { name: 'docs', marketplace: 'official' },
    });
    expect(port.mutatePlugin).toHaveBeenNthCalledWith(2, {
      action: 'disable',
      plugin: { name: 'docs', marketplace: 'official' },
    });
    expect(port.mutatePlugin).toHaveBeenNthCalledWith(3, {
      action: 'remove',
      plugin: { name: 'docs', marketplace: 'official' },
    });
    expect(port.refreshPlugins).toHaveBeenCalledOnce();
  });
});
