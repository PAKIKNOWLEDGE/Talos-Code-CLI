import { isTelemetryChannelEnabled } from '@mavis/config';
import { describe, expect, it, vi } from 'vitest';

import {
  createMcodeBusinessTelemetry,
  createMcodeBusinessTelemetryPreview,
  resolveMcodeBusinessTelemetryPolicy,
  type SensorsPayload,
} from '../../src/analytics/business-telemetry.js';
import { createTuiProgram } from '../../src/cli/program.js';
import { runMcodeTelemetryCommand } from '../../src/cli/telemetry-command.js';
import { createConfiguredTuiBusinessTelemetry } from '../../src/tui/launcher.js';

describe('business telemetry privacy', () => {
  it('blocks upstream clients and all status channels in neutral mode despite opt-in', () => {
    const environment = { TALOS_NEUTRAL_RUNTIME: '1' };
    const createTelemetry = vi.fn();
    expect(resolveMcodeBusinessTelemetryPolicy({ configEnabled: true, environment })).toEqual({
      enabled: false, configured: true, blockedBy: 'TALOS_NEUTRAL_RUNTIME',
    });
    expect(createConfiguredTuiBusinessTelemetry({
      configEnabled: true, environment, createTelemetry,
      telemetryOptions: { region: 'en', buildEnv: 'prod', version: '0.5.7' },
    })).toBeUndefined();
    expect(createTelemetry).not.toHaveBeenCalled();
    const resolveEnvironment = vi.fn();
    for (const action of ['status', 'preview'] as const) {
      const result = JSON.parse(runMcodeTelemetryCommand(action, '0.5.7', {
        environment,
        readConfig: () => ({ telemetry: { enabled: true, metrics: true, diagnostics: true } }),
        readConfigPath: () => '/synthetic/config.yaml', resolveEnvironment,
      }));
      for (const channel of ['usage', 'metrics', 'diagnostics']) {
        expect(result.channels[channel]).toEqual({
          enabled: false, configured: true, blockedBy: 'TALOS_NEUTRAL_RUNTIME',
        });
      }
      expect(result.optInAvailable).toBe(false);
      expect(result.optInSetting).toBeNull();
      if (action === 'preview') {
        expect(result.request).toBeNull();
        expect(result.message).toContain('Local diagnostics remain available');
      }
    }
    expect(resolveEnvironment).not.toHaveBeenCalled();
  });

  it.each(['enabled', 'metrics', 'diagnostics'] as const)(
    'blocks the shared %s channel without reading consent in neutral mode', (channel) => {
      vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
      try {
        const readConfigured = vi.fn(() => true);
        expect(isTelemetryChannelEnabled(channel, readConfigured)).toBe(false);
        expect(readConfigured).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );

  it.each(['before collecting', 'before draining'] as const)(
    'never sends upstream business events when neutral is enabled %s', async (phase) => {
      vi.stubEnv('TALOS_NEUTRAL_RUNTIME', phase === 'before collecting' ? '1' : '');
      vi.stubEnv('MCODE_DISABLE_TELEMETRY', '');
      vi.stubEnv('DO_NOT_TRACK', '');
      try {
        const fetchRequest = vi.fn<typeof fetch>();
        const telemetry = createMcodeBusinessTelemetry({
          region: 'en', buildEnv: 'prod', version: '0.5.7', fetch: fetchRequest,
        });
        telemetry.track('tui_launch', { launch_type: 'cold' });
        vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '1');
        await telemetry.flush();
        expect(fetchRequest).not.toHaveBeenCalled();
        vi.stubEnv('TALOS_NEUTRAL_RUNTIME', '');
        await telemetry.flush();
        expect(fetchRequest).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    },
  );

  it('is disabled until configured and honors both environment opt-outs', () => {
    expect(resolveMcodeBusinessTelemetryPolicy({ environment: {} })).toEqual({
      enabled: false,
      configured: false,
    });
    expect(
      resolveMcodeBusinessTelemetryPolicy({
        configEnabled: true,
        environment: {},
      }),
    ).toEqual({ enabled: true, configured: true });
    expect(
      resolveMcodeBusinessTelemetryPolicy({
        configEnabled: true,
        environment: { MCODE_DISABLE_TELEMETRY: '1' },
      }),
    ).toEqual({
      enabled: false,
      configured: true,
      blockedBy: 'MCODE_DISABLE_TELEMETRY',
    });
    expect(
      resolveMcodeBusinessTelemetryPolicy({
        configEnabled: true,
        environment: { DO_NOT_TRACK: 'true' },
      }),
    ).toEqual({ enabled: false, configured: true, blockedBy: 'DO_NOT_TRACK' });
  });

  it('sends only the documented low-sensitivity fields and uses a new ID per event', async () => {
    const requests: RequestInit[] = [];
    const ids = ['event-1', 'event-2'];
    const telemetry = createMcodeBusinessTelemetry({
      region: 'en',
      buildEnv: 'prod',
      version: '0.4.12',
      now: () => 123,
      randomId: () => ids.shift()!,
      fetch: vi.fn(async (_url, init) => {
        requests.push(init!);
        return new Response(null, { status: 204 });
      }),
    });

    const runtimeTelemetry = telemetry as unknown as {
      track(event: string, properties: Record<string, unknown>): void;
    };
    runtimeTelemetry.track('chat_send', {
      chat_type: 'chat',
      is_first_message: 1,
      is_attachment: 'text',
      prompt: 'private prompt',
      response: 'private response',
      filename: 'secret.txt',
      plugin_name: 'private plugin',
      credential: 'private credential',
      access_token: 'private token',
      workspace: '/private/workspace',
      session_id: 'private session',
      model: 'private model',
      command_name: 'private command',
      region: 'private region',
    });
    runtimeTelemetry.track('slash_command_click', {
      chat_type: 'chat',
      command_type: 'other',
    });
    await telemetry.flush();

    const payloads = requests.map(decodeRequestBody);
    expect(payloads).toHaveLength(2);
    expect(payloads.map((payload) => payload.distinct_id)).toEqual(['event-1', 'event-2']);
    expect(payloads.map((payload) => payload.identities.$identity_cookie_id)).toEqual([
      'event-1',
      'event-2',
    ]);
    expect(payloads[0]?.properties).toEqual({
      surface: 'tui',
      os: process.platform,
      region: 'en',
      build_env: 'prod',
      app_version: '0.4.12',
      chat_type: 'chat',
      is_first_message: 1,
      is_attachment: 'text',
    });
    expect(JSON.stringify(payloads)).not.toMatch(
      /hailuo_user_id|op_group_id|device_id|real_device_id|project_id|chat_id|session_id|model|command_name|workspace|prompt|response|file(?:name|path)|plugin|credential|token|secret/iu,
    );
  });

  it('previews the decoded request without sending it', () => {
    const fetchRequest = vi.fn();
    const preview = createMcodeBusinessTelemetryPreview(
      'tui_launch',
      { launch_type: 'cold' },
      {
        region: 'cn',
        buildEnv: 'prod',
        version: '0.4.12',
        now: () => 456,
        randomId: () => 'single-event',
        fetch: fetchRequest,
      },
    );

    expect(preview).toMatchObject({
      endpoint: 'https://data.hailuoai.com/meerkat-reporter/api/report?project=MiniMaxAgent',
      method: 'POST',
      payload: {
        distinct_id: 'single-event',
        event: 'tui_launch',
        time: 456,
        properties: { launch_type: 'cold' },
      },
    });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('does not create a TUI telemetry client without effective opt-in', () => {
    const telemetry = { track: vi.fn(), flush: vi.fn(async () => undefined) };
    const createTelemetry = vi.fn(() => telemetry);
    const telemetryOptions = {
      region: 'en' as const,
      buildEnv: 'prod' as const,
      version: '0.4.12',
    };

    expect(
      createConfiguredTuiBusinessTelemetry({
        configEnabled: false,
        environment: {},
        telemetryOptions,
        createTelemetry,
      }),
    ).toBeUndefined();
    expect(
      createConfiguredTuiBusinessTelemetry({
        configEnabled: true,
        environment: { MCODE_DISABLE_TELEMETRY: '1' },
        telemetryOptions,
        createTelemetry,
      }),
    ).toBeUndefined();
    expect(
      createConfiguredTuiBusinessTelemetry({
        configEnabled: true,
        environment: { DO_NOT_TRACK: '1' },
        telemetryOptions,
        createTelemetry,
      }),
    ).toBeUndefined();
    expect(createTelemetry).not.toHaveBeenCalled();

    expect(
      createConfiguredTuiBusinessTelemetry({
        configEnabled: true,
        environment: {},
        telemetryOptions,
        createTelemetry,
      }),
    ).toBe(telemetry);
    expect(createTelemetry).toHaveBeenCalledOnce();
  });

  it('distinguishes disabled usage previews from enabled metrics and diagnostics', () => {
    const output = JSON.parse(runMcodeTelemetryCommand('preview', '0.4.12', {
      environment: {},
      readConfig: () => ({ telemetry: { enabled: false, metrics: true, diagnostics: true } }),
      readConfigPath: () => '/tmp/config.yaml',
    }));
    expect(output).toMatchObject({
      request: null,
      channels: {
        usage: { enabled: false },
        metrics: { enabled: true },
        diagnostics: { enabled: true },
      },
      message: 'Usage telemetry is disabled. No business telemetry request will be sent.',
    });
  });

  it('reports disabled status and exposes status and preview CLI subcommands', async () => {
    const output = runMcodeTelemetryCommand('preview', '0.4.12', {
      environment: {},
      readConfig: () => ({ telemetry: { enabled: false } }),
      readConfigPath: () => '/tmp/config.yaml',
    });
    expect(JSON.parse(output)).toMatchObject({ enabled: false, request: null });
    const enabledOutput = runMcodeTelemetryCommand('preview', '0.4.12', {
      environment: {},
      readConfig: () => ({ telemetry: { enabled: true } }),
      readConfigPath: () => '/tmp/config.yaml',
      resolveEnvironment: () => ({ region: 'en', buildEnv: 'prod' }),
      now: () => 789,
      randomId: () => 'preview-event',
    });
    expect(JSON.parse(enabledOutput)).toMatchObject({
      enabled: true,
      request: {
        endpoint: 'https://data.hailuo.ai/meerkat-reporter/api/report?project=MiniMaxAgent',
        payload: {
          identities: { $identity_cookie_id: 'preview-event' },
          distinct_id: 'preview-event',
          event: 'tui_launch',
          time: 789,
        },
      },
    });

    const runTelemetry = vi.fn(async () => undefined);
    for (const action of ['status', 'preview'] as const) {
      const program = createTuiProgram({
        version: '0.4.12',
        launchTui: vi.fn(async () => undefined),
        runExec: vi.fn(async () => undefined),
        runLogin: vi.fn(async () => undefined),
        runLogout: vi.fn(async () => undefined),
        runUpdate: vi.fn(async () => undefined),
        runTelemetry,
      });
      await program.parseAsync(['node', 'mcode', 'telemetry', action]);
    }
    expect(runTelemetry.mock.calls).toEqual([['status'], ['preview']]);
  });
});

function decodeRequestBody(init: RequestInit): SensorsPayload {
  const parameters = new URLSearchParams(String(init.body));
  const data = parameters.get('data');
  if (!data) throw new Error('Missing telemetry payload.');
  return JSON.parse(Buffer.from(data, 'base64').toString('utf8')) as SensorsPayload;
}
