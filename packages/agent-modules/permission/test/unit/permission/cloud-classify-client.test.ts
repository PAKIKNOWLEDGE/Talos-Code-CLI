import { afterEach, describe, expect, it, vi } from 'vitest';

import { getPermissionCheckApiUrl, shouldUseCloudClassify } from '../../../src/classifier/cloud-classify-client.js';
import { HttpCloudGatewayClient } from '../../../src/http-cloud-gateway-client.js';
import {
  configurePermissionHost,
  resetPermissionHostForTesting,
} from '../../../src/host-utils.js';

describe('getPermissionCheckApiUrl', () => {
  afterEach(() => {
    resetPermissionHostForTesting();
  });

  it('uses the China production domain for Desktop permission checks', () => {
    configurePermissionHost({
      runtimeConfigProvider: {
        getConfig: () => {
          throw new Error('not needed by endpoint resolution');
        },
        getRuntimeRegion: () => 'cn',
        getRuntimeBuildEnv: () => 'prod',
        isManagedRuntime: () => true,
      },
    });

    expect(getPermissionCheckApiUrl()).toBe(
      'https://agent.minimax.cn/mavis/api/v1/permission/check',
    );
  });
});

describe('Talos permission cloud boundary', () => {
  afterEach(() => { resetPermissionHostForTesting(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each([false, true])('does not select cloud classification in neutral mode even when managed=%s', (managed) => {
    configurePermissionHost({ runtimeConfigProvider: {
      getConfig: () => ({}), getRuntimeRegion: () => 'en', getRuntimeBuildEnv: () => 'prod',
      isManagedRuntime: () => managed,
    } });
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
    expect(shouldUseCloudClassify()).toBe(false);
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '');
    expect(shouldUseCloudClassify()).toBe(managed);
  });

  it('returns the existing fail-closed verdict before reading request context, credentials or the network', async () => {
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
    const fetchRequest = vi.fn(); vi.stubGlobal('fetch', fetchRequest);
    const authTokenProvider = vi.fn(() => 'synthetic-token');
    const contextReader = vi.fn(() => 'synthetic context');
    const client = new HttpCloudGatewayClient({ endpointOverride: 'https://synthetic.invalid/check', authTokenProvider });
    const verdict = await client.classify({ get toolName() { return contextReader(); } } as never);
    expect(verdict).toMatchObject({ kind: 'timeout', model: 'cloud:unavailable', durationMs: 0 });
    expect(verdict.reasonLocalized).toContain('user confirmation is required');
    expect(contextReader).not.toHaveBeenCalled(); expect(authTokenProvider).not.toHaveBeenCalled();
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('preserves the non-neutral HTTP protocol when using an explicit fake transport', async () => {
    vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '');
    const fetchRequest = vi.fn(async () => Response.json({ verdict: 'allow', reason: 'synthetic allow', model: 'synthetic-model' }));
    vi.stubGlobal('fetch', fetchRequest);
    const client = new HttpCloudGatewayClient({ endpointOverride: 'https://synthetic.invalid/check', authTokenProvider: () => 'synthetic-token' });
    await expect(client.classify({ toolName: 'bash', input: '{"command":"synthetic"}', platform: 'win32',
      homeDir: '/synthetic/home', workspaceRoot: '/synthetic/workspace', mode: 'auto', conversationContext: 'synthetic context',
    })).resolves.toMatchObject({ kind: 'allow', reasonLocalized: 'synthetic allow', model: 'synthetic-model' });
    expect(fetchRequest).toHaveBeenCalledOnce();
    expect(new Headers(fetchRequest.mock.calls[0]?.[1]?.headers).get('Authorization')).toBe('Bearer synthetic-token');
  });
});
