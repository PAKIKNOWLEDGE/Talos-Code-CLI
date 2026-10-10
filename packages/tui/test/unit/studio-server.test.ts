import { describe, expect, it, vi } from 'vitest';

import { createStudioServer } from '../../src/studio/server.js';
import { STUDIO_PROTOCOL_VERSION, STUDIO_SERVER_NAME } from '../../src/studio/protocol.js';
import type { StudioRuntime } from '../../src/studio/runtime.js';

vi.mock('../../src/application/login-gate.js', () => ({
  requireTuiAgentAccess: vi.fn(async () => undefined),
}));

function createSink() {
  const responses: unknown[] = [];
  const notifications: unknown[] = [];
  return {
    responses,
    notifications,
    sink: {
      respond: (id: unknown, result: unknown) => {
        responses.push({ id, result });
      },
      respondError: (id: unknown, code: number, message: string) => {
        responses.push({ id, error: { code, message } });
      },
      notify: (method: string, params: unknown) => {
        notifications.push({ method, params });
      },
    },
  };
}

function createRuntime(overrides: Partial<StudioRuntime> = {}): StudioRuntime {
  const session = {
    sessionId: 'session-1',
    workspaceDir: 'C:\\workspace',
    title: 'Test',
  };
  return {
    createSession: vi.fn(async () => session),
    getSession: vi.fn(async () => session),
    listSessionPage: vi.fn(async () => ({ sessions: [session], hasMore: false })),
    deleteSession: vi.fn(async () => undefined),
    listModels: vi.fn(async () => []),
    getPermissionMode: vi.fn(async () => 'default'),
    getPlanModeCapabilities: vi.fn(async () => ({ entryEnabled: false })),
    listPendingPermissions: vi.fn(async () => []),
    replyPermission: vi.fn(async () => true),
    sendMessage: vi.fn(),
    abortSession: vi.fn(async () => true),
    steer: vi.fn(),
    isGoalEnabled: vi.fn(() => false),
    listSkills: vi.fn(async () => ({ skills: [] })),
    getActiveRun: vi.fn(async () => ({
      schemaVersion: 1,
      sessionId: 'session-1',
      state: 'idle',
      actions: { steer: false },
    })),
    ...overrides,
  } as unknown as StudioRuntime;
}

describe('Talos studio server', () => {
  it('initializes with protocol metadata', async () => {
    const { sink, responses } = createSink();
    const server = createStudioServer(
      { runtime: createRuntime(), version: '0.1.3', workspaceDir: 'C:\\workspace' },
      sink,
    );
    await server.dispatch({
      id: 1,
      method: 'studio/initialize',
      params: { cwd: 'C:\\workspace' },
    });
    expect(responses[0]).toEqual({
      id: 1,
      result: {
        protocolVersion: STUDIO_PROTOCOL_VERSION,
        serverName: STUDIO_SERVER_NAME,
        productVersion: '0.1.3',
        cwd: 'C:\\workspace',
      },
    });
  });

  it('lists sessions for a workspace', async () => {
    const runtime = createRuntime();
    const { sink, responses } = createSink();
    const server = createStudioServer(
      { runtime, version: '0.1.3', workspaceDir: 'C:\\workspace' },
      sink,
    );
    await server.dispatch({
      id: 2,
      method: 'session/list',
      params: { cwd: 'C:\\workspace' },
    });
    expect(runtime.listSessionPage).toHaveBeenCalledWith({
      workspaceDir: 'C:\\workspace',
      includeArchived: true,
    });
    expect(responses[0]).toMatchObject({ id: 2, result: { sessions: [{ sessionId: 'session-1' }] } });
  });

  it('creates and deletes a session', async () => {
    const runtime = createRuntime();
    const { sink, responses } = createSink();
    const server = createStudioServer(
      { runtime, version: '0.1.3', workspaceDir: 'C:\\workspace' },
      sink,
    );
    await server.dispatch({
      id: 3,
      method: 'session/create',
      params: { cwd: 'C:\\workspace' },
    });
    expect(runtime.createSession).toHaveBeenCalled();
    expect(responses[0]).toMatchObject({ id: 3, result: { session: { sessionId: 'session-1' } } });

    await server.dispatch({ id: 4, method: 'session/delete', params: { sessionId: 'session-1' } });
    expect(runtime.deleteSession).toHaveBeenCalledWith('session-1');
    expect(responses[1]).toEqual({ id: 4, result: {} });
  });

  it('lists slash commands for an attached session', async () => {
    const runtime = createRuntime();
    const { sink, responses } = createSink();
    const server = createStudioServer(
      { runtime, version: '0.1.3', workspaceDir: 'C:\\workspace' },
      sink,
    );
    await server.dispatch({
      id: 5,
      method: 'session/create',
      params: { cwd: 'C:\\workspace' },
    });
    await server.dispatch({ id: 6, method: 'commands/list', params: { sessionId: 'session-1' } });
    expect(runtime.listSkills).toHaveBeenCalled();
    expect(responses[1]).toMatchObject({
      id: 6,
      result: { commands: expect.arrayContaining([expect.objectContaining({ name: 'help' })]) },
    });
  });

  it('accepts session/setMode for plan transition', async () => {
    const runtime = createRuntime({
      getPlanModeCapabilities: vi.fn(async () => ({ entryEnabled: true })),
      getSession: vi.fn(async () => ({
        sessionId: 'session-1',
        workspaceDir: 'C:\\workspace',
        interactionMode: 'default',
      })),
    });
    const { sink, responses } = createSink();
    const server = createStudioServer(
      { runtime, version: '0.1.3', workspaceDir: 'C:\\workspace' },
      sink,
    );
    await server.dispatch({
      id: 7,
      method: 'session/create',
      params: { cwd: 'C:\\workspace' },
    });
    await server.dispatch({
      id: 8,
      method: 'session/setMode',
      params: { sessionId: 'session-1', modeId: 'plan' },
    });
    expect(responses[1]).toMatchObject({
      id: 8,
      result: { transition: 'next_turn' },
    });
  });
});
