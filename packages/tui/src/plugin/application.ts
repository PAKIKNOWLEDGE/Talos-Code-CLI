import type {
  McodePluginCatalog,
  McodePluginMarketplace,
  McodePluginRuntimeAccess,
  McodePluginView,
} from './contract.js';

export class McodePluginApplication {
  constructor(private readonly access: McodePluginRuntimeAccess) {}

  async catalog(input: {
    readonly includeAvailable: boolean;
    readonly marketplace?: McodePluginMarketplace;
  }): Promise<McodePluginCatalog> {
    const neutral = process.env.TALOS_NEUTRAL_RUNTIME === '1';
    requirePluginMarketplace(input.marketplace);
    const marketplace = input.marketplace ?? (neutral ? 'local' : undefined);
    if (!input.includeAvailable) {
      return {
        installed: (await this.access.listInstalledPlugins({ marketplace }))
          .filter((plugin) => !neutral || plugin.marketplace === 'local'),
        available: [],
      };
    }
    const marketplaces: readonly McodePluginMarketplace[] = marketplace
      ? [marketplace]
      : ['official', 'local'];
    const [installed, ...marketplaceCatalogs] = await Promise.all([
      this.access.listInstalledPlugins({ marketplace }),
      ...marketplaces.map((catalogMarketplace) => this.access.listMarketplacePlugins({ marketplace: catalogMarketplace })),
    ]);
    const merged = new Map(
      marketplaceCatalogs.flat().map((plugin) => [plugin.pluginId, plugin] as const),
    );
    for (const plugin of installed) merged.set(plugin.pluginId, plugin);
    return partitionCatalog([...merged.values()].filter((plugin) => !neutral || plugin.marketplace === 'local'));
  }

  install(plugin: McodePluginView): Promise<McodePluginView> {
    return this.mutate(plugin, 'install');
  }

  remove(plugin: McodePluginView): Promise<McodePluginView> {
    return this.mutate(plugin, 'remove');
  }

  setEnabled(plugin: McodePluginView, enabled: boolean): Promise<McodePluginView> {
    return this.mutate(plugin, enabled ? 'enable' : 'disable');
  }

  refresh(): Promise<void> {
    return this.access.refreshPlugins();
  }

  private async mutate(
    plugin: McodePluginView,
    action: 'install' | 'remove' | 'enable' | 'disable',
  ): Promise<McodePluginView> {
    requirePluginMarketplace(plugin.marketplace);
    const result = await this.access.mutatePlugin({
      action,
      plugin: { name: plugin.name, marketplace: plugin.marketplace },
    });
    return { ...plugin, ...result };
  }
}

function partitionCatalog(plugins: readonly McodePluginView[]): McodePluginCatalog {
  const installed: McodePluginView[] = [];
  const available: McodePluginView[] = [];
  for (const plugin of plugins) {
    (plugin.installed ? installed : available).push(plugin);
  }
  return { installed, available };
}

function requirePluginMarketplace(marketplace: McodePluginMarketplace | undefined): void {
  if (process.env.TALOS_NEUTRAL_RUNTIME === '1' && marketplace === 'official') {
    throw new Error('Upstream plugin marketplace is unavailable in Talos. Use local plugins.');
  }
}
