import { randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';

import { executeTuiInteractiveTurn } from '../application/interactive-turn-delivery.js';
import { requireTuiAgentAccess } from '../application/login-gate.js';
import { TuiRunCoordinator } from '../application/run-coordinator.js';
import {
  ACP_MODE_DEFAULT,
  ACP_MODE_PLAN,
  getTuiAcpSessionControlState,
} from '../acp/control-state.js';
import { availableSkillCommands, TUI_ACP_AVAILABLE_COMMANDS } from '../acp/commands.js';
import { resolveRootSessionId } from '../acp/extensions.js';
import type { GlobalThreadGoal } from '@mavis/shared/global-events';
import type {
  TuiPlanClientIntent,
  TuiQuestionnaireReplyAnswer,
  TuiSession,
  TuiSessionForkPort,
  TuiSessionMcpServer,
} from '../runtime/port.js';
import type { TuiStreamEvent } from '../runtime/stream-events.js';
import type { McodePluginMarketplace } from '../plugin/contract.js';
import { StudioProtocolError } from './errors.js';
import { studioConfigOptions, studioSetConfigOption } from './config.js';
import { STUDIO_PROTOCOL_VERSION, STUDIO_SERVER_NAME } from './protocol.js';
import { requireRecord, requireSessionIdParam, requireText } from './params.js';
import type { StudioRuntime } from './runtime.js';

export interface StudioServerOptions {
  readonly runtime: StudioRuntime;
  readonly version: string;
  readonly workspaceDir?: string;
  readonly createTurnId?: () => string;
}

interface StudioAttachment {
  session: TuiSession;
  coordinator: TuiRunCoordinator;
  readonly attachmentController: AbortController;
  activeTurnId?: string;
  activePromptController?: AbortController;
  pendingModeIntent?: TuiPlanClientIntent;
  activePromptTargetModeId?: typeof ACP_MODE_DEFAULT | typeof ACP_MODE_PLAN;
}

export type StudioJsonRpcId = string | number | null;

export interface StudioJsonRpcRequest {
  readonly id?: StudioJsonRpcId;
  readonly method?: string;
  readonly params?: unknown;
}

export interface StudioServerSink {
  respond(id: StudioJsonRpcId, result: unknown): void;
  respondError(id: StudioJsonRpcId, code: number, message: string): void;
  notify(method: string, params: unknown): void;
}

function parsePluginMarketplace(value: unknown): McodePluginMarketplace {
  if (value === 'official' || value === 'local') return value;
  throw new StudioProtocolError(-32602, 'marketplace must be official or local.');
}

function requireForkRuntime(runtime: StudioRuntime): StudioRuntime & TuiSessionForkPort {
  if (!runtime.forkSession || !runtime.getSessionForkOptions) {
    throw new StudioProtocolError(-32000, 'Session fork is not supported by this runtime.');
  }
  return runtime as StudioRuntime & TuiSessionForkPort;
}

export function createStudioServer(options: StudioServerOptions, sink: StudioServerSink) {
  const sessions = new Map<string, StudioAttachment>();
  let defaultCwd = resolve(options.workspaceDir ?? process.cwd());
  const createTurnId = options.createTurnId ?? randomUUID;
  let runtimeEventWatch: AbortController | undefined;
  let usageCommitWatch: AbortController | undefined;

  const requireCwd = (cwd: unknown): string => {
    if (typeof cwd !== 'string' || !cwd) {
      throw new StudioProtocolError(-32602, 'cwd must be a non-empty absolute path.');
    }
    if (!isAbsolute(cwd)) {
      throw new StudioProtocolError(-32602, 'cwd must be absolute.');
    }
    return cwd;
  };

  const requireSessionId = (sessionId: unknown): string => {
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new StudioProtocolError(-32602, 'sessionId is required.');
    }
    return sessionId;
  };

  const requireAttached = (sessionId: string): StudioAttachment => {
    const active = sessions.get(sessionId);
    if (!active) {
      throw new StudioProtocolError(-32004, `Session ${sessionId} is not attached.`);
    }
    return active;
  };

  const attachSession = (session: TuiSession): StudioAttachment => {
    const existing = sessions.get(session.sessionId);
    if (existing) {
      existing.attachmentController.abort(new Error('Studio session attachment replaced.'));
    }
    const attachment: StudioAttachment = {
      session,
      coordinator: new TuiRunCoordinator(options.runtime),
      attachmentController: new AbortController(),
    };
    sessions.set(session.sessionId, attachment);
    return attachment;
  };

  const parseTurnInput = (input: unknown): string => {
    if (typeof input === 'string') return input;
    if (!Array.isArray(input)) {
      throw new StudioProtocolError(-32602, 'turn input must be a string or content array.');
    }
    const parts: string[] = [];
    for (const block of input) {
      if (!block || typeof block !== 'object') continue;
      const record = block as { type?: string; text?: string };
      if (record.type === 'text' && typeof record.text === 'string') parts.push(record.text);
    }
    if (parts.length === 0) {
      throw new StudioProtocolError(-32602, 'turn input must include at least one text block.');
    }
    return parts.join('\n');
  };

  const emitTurnEvent = (sessionId: string, turnId: string, event: TuiStreamEvent) => {
    sink.notify('turn/event', { sessionId, turnId, event });
  };

  const emitTurnCompleted = (
    sessionId: string,
    turnId: string,
    status: 'succeeded' | 'cancelled' | 'failed',
    error?: string,
  ) => {
    sink.notify('turn/completed', { sessionId, turnId, status, ...(error ? { error } : {}) });
  };

  const isSessionTurnTerminal = (event: TuiStreamEvent): boolean => {
    if (event.type === 'done' || event.type === 'error') return true;
    return (
      event.type === 'session-status' &&
      (event.status === 'finished' ||
        event.status === 'error' ||
        event.status === 'aborted' ||
        event.status === 'interrupted')
    );
  };

  async function handleMethod(method: string, params: unknown): Promise<unknown> {
    await requireTuiAgentAccess(options.runtime);

    switch (method) {
      case 'studio/initialize': {
        const record = params && typeof params === 'object' ? (params as { cwd?: string }) : {};
        if (record.cwd) defaultCwd = requireCwd(record.cwd);
        return {
          protocolVersion: STUDIO_PROTOCOL_VERSION,
          serverName: STUDIO_SERVER_NAME,
          productVersion: options.version,
          cwd: defaultCwd,
        };
      }
      case 'session/list': {
        const record =
          params && typeof params === 'object'
            ? (params as { cwd?: string; cursor?: string; limit?: number })
            : {};
        const cwd = record.cwd ? requireCwd(record.cwd) : defaultCwd;
        const page = await options.runtime.listSessionPage({
          workspaceDir: cwd,
          includeArchived: true,
          ...(record.cursor ? { cursor: record.cursor } : {}),
          ...(record.limit ? { limit: record.limit } : {}),
        });
        return {
          sessions: page.sessions,
          ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        };
      }
      case 'session/create': {
        const record =
          params && typeof params === 'object' ? (params as { cwd?: string; title?: string }) : {};
        const cwd = record.cwd ? requireCwd(record.cwd) : defaultCwd;
        const session = await options.runtime.createSession({
          workspaceDir: cwd,
          ...(record.title ? { title: record.title } : {}),
        });
        attachSession(session);
        return { session, ...(await studioConfigOptions(options.runtime, session)) };
      }
      case 'session/load': {
        const record =
          params && typeof params === 'object'
            ? (params as { sessionId?: string; cwd?: string })
            : {};
        const sessionId = requireSessionId(record.sessionId);
        const cwd = record.cwd ? requireCwd(record.cwd) : defaultCwd;
        const session = await options.runtime.getSession(sessionId);
        const workspace = session.workspaceDir ?? cwd;
        if (resolve(workspace) !== resolve(cwd)) {
          throw new StudioProtocolError(-32602, 'Session cwd does not match the requested workspace.');
        }
        attachSession(session);
        return { session, ...(await studioConfigOptions(options.runtime, session)) };
      }
      case 'session/resume': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const session = await options.runtime.getSession(sessionId);
        attachSession(session);
        return { session, ...(await studioConfigOptions(options.runtime, session)) };
      }
      case 'session/forkOptions': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const forkRuntime = requireForkRuntime(options.runtime);
        const assistantMessageId =
          typeof record.assistantMessageId === 'string' ? record.assistantMessageId : undefined;
        return {
          options: await forkRuntime.getSessionForkOptions(sessionId, assistantMessageId),
        };
      }
      case 'session/fork': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        const forkRuntime = requireForkRuntime(options.runtime);
        const forkOptions = await forkRuntime.getSessionForkOptions(
          sessionId,
          typeof record.assistantMessageId === 'string' ? record.assistantMessageId : undefined,
        );
        if (!forkOptions.canFork) {
          throw new StudioProtocolError(
            -32602,
            forkOptions.unavailableReason ?? 'Runtime rejected this session fork.',
          );
        }
        const result = await forkRuntime.forkSession({
          sessionId,
          clientRequestId: randomUUID(),
          useSuggestedTitle: record.useSuggestedTitle !== false,
          createIsolatedWorktree: record.createIsolatedWorktree === true,
          ...(typeof record.title === 'string' ? { title: record.title } : {}),
          ...(typeof record.assistantMessageId === 'string'
            ? { assistantMessageId: record.assistantMessageId }
            : {}),
        });
        const mcpServers = Array.isArray(record.mcpServers)
          ? (record.mcpServers as TuiSessionMcpServer[])
          : [];
        if (mcpServers.length > 0) {
          await options.runtime.clearSessionMcpServers(result.session.sessionId);
          await options.runtime.configureSessionMcpServers(result.session.sessionId, mcpServers);
        }
        attachSession(result.session);
        return {
          ...result,
          ...(await studioConfigOptions(options.runtime, result.session)),
        };
      }
      case 'session/rewindPreview': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const userMessageId = requireText(record.userMessageId, 'userMessageId');
        requireAttached(sessionId);
        return {
          preview: await options.runtime.getSessionRewindPreview({ sessionId, userMessageId }),
        };
      }
      case 'session/rewind': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const userMessageId = requireText(record.userMessageId, 'userMessageId');
        requireAttached(sessionId);
        return {
          result: await options.runtime.rewindSession({
            sessionId,
            userMessageId,
            clientRequestId: randomUUID(),
            ...(record.rewindTurnDiff === true ? { rewindTurnDiff: true } : {}),
          }),
        };
      }
      case 'session/editMessage': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const userMessageId = requireText(record.userMessageId, 'userMessageId');
        const content = requireText(record.content, 'content');
        requireAttached(sessionId);
        return {
          result: await options.runtime.editSessionMessage({
            sessionId,
            userMessageId,
            content,
            clientRequestId: randomUUID(),
            ...(record.rewindTurnDiff === true ? { rewindTurnDiff: true } : {}),
            ...(Array.isArray(record.attachments) ? { attachments: record.attachments } : {}),
          }),
        };
      }
      case 'session/mcp/configure': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        if (!Array.isArray(record.servers)) {
          throw new StudioProtocolError(-32602, 'servers must be an array.');
        }
        await options.runtime.configureSessionMcpServers(
          sessionId,
          record.servers as TuiSessionMcpServer[],
        );
        return {};
      }
      case 'session/mcp/clear': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        await options.runtime.clearSessionMcpServers(sessionId);
        return {};
      }
      case 'session/inputSummaries': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        return {
          summaries: await options.runtime.listSessionInputSummaries(sessionId, {
            ...(typeof record.limit === 'number' ? { limit: record.limit } : {}),
            ...(typeof record.before === 'string' ? { before: record.before } : {}),
          }),
        };
      }
      case 'session/delete': {
        const record =
          params && typeof params === 'object' ? (params as { sessionId?: string }) : {};
        const sessionId = requireSessionId(record.sessionId);
        const active = sessions.get(sessionId);
        if (active) {
          active.attachmentController.abort(new Error('Studio session deleted.'));
          active.activePromptController?.abort();
          sessions.delete(sessionId);
        }
        await options.runtime.deleteSession(sessionId);
        return {};
      }
      case 'session/close': {
        const sessionId = requireSessionIdParam(params);
        const active = sessions.get(sessionId);
        if (!active) {
          throw new StudioProtocolError(-32004, `Session ${sessionId} is not attached.`);
        }
        active.attachmentController.abort(new Error('Studio session closed.'));
        active.activePromptController?.abort();
        sessions.delete(sessionId);
        return {};
      }
      case 'session/setMode': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const modeId = requireText(record.modeId, 'modeId');
        if (modeId !== ACP_MODE_DEFAULT && modeId !== ACP_MODE_PLAN) {
          throw new StudioProtocolError(-32602, 'modeId must be default or plan.');
        }
        const active = requireAttached(sessionId);
        active.session = await options.runtime.getSession(sessionId);
        const state = await getTuiAcpSessionControlState(options.runtime, active.session);
        if (!state.modes.availableModes.some((mode) => mode.id === modeId)) {
          throw new StudioProtocolError(-32602, `Unsupported session mode: ${modeId}`);
        }
        const currentMode = state.modes.currentModeId;
        const activePromptTarget = active.activePromptTargetModeId;
        if (activePromptTarget && modeId !== activePromptTarget) {
          active.pendingModeIntent = modeId === ACP_MODE_PLAN ? 'plan-entry' : 'plan-exit';
        } else if (modeId === currentMode || modeId === activePromptTarget) {
          active.pendingModeIntent = undefined;
        } else {
          active.pendingModeIntent = modeId === ACP_MODE_PLAN ? 'plan-entry' : 'plan-exit';
        }
        return {
          modes: state.modes,
          transition: active.pendingModeIntent ? 'next_turn' : 'settled',
        };
      }
      case 'session/rename': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const title = requireText(record.title, 'title');
        requireAttached(sessionId);
        const session = await options.runtime.renameSession(sessionId, title);
        const active = sessions.get(sessionId);
        if (active) active.session = session;
        return { session };
      }
      case 'session/archive': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const archived = record.archived === true;
        requireAttached(sessionId);
        await options.runtime.archiveSession(sessionId, archived);
        return { archived };
      }
      case 'session/messages': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        const page = await options.runtime.listMessagePage(sessionId, {
          ...(typeof record.limit === 'number' ? { limit: record.limit } : {}),
          ...(typeof record.cursor === 'string' ? { cursor: record.cursor } : {}),
          ...(typeof record.before === 'string' ? { before: record.before } : {}),
        });
        return page;
      }
      case 'session/activeRun': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { activeRun: await options.runtime.getActiveRun(sessionId) };
      }
      case 'commands/list': {
        const sessionId = requireSessionIdParam(params);
        const active = requireAttached(sessionId);
        const workspace = active.session.workspaceDir ?? defaultCwd;
        const skillList = await options.runtime.listSkills(undefined, undefined, workspace);
        return {
          commands: [...TUI_ACP_AVAILABLE_COMMANDS, ...availableSkillCommands(skillList)],
        };
      }
      case 'config/options': {
        const record =
          params && typeof params === 'object' ? (params as { sessionId?: string }) : {};
        const sessionId = requireSessionId(record.sessionId);
        const active = requireAttached(sessionId);
        return await studioConfigOptions(options.runtime, active.session);
      }
      case 'config/set': {
        const record =
          params && typeof params === 'object'
            ? (params as { sessionId?: string; configId?: string; value?: string })
            : {};
        const sessionId = requireSessionId(record.sessionId);
        const active = requireAttached(sessionId);
        if (typeof record.configId !== 'string' || typeof record.value !== 'string') {
          throw new StudioProtocolError(-32602, 'configId and value are required.');
        }
        const result = await studioSetConfigOption(
          options.runtime,
          active.session,
          record.configId,
          record.value,
        );
        active.session = await options.runtime.getSession(sessionId);
        return result;
      }
      case 'turn/start': {
        const record =
          params && typeof params === 'object'
            ? (params as { sessionId?: string; input?: unknown; turnId?: string })
            : {};
        const sessionId = requireSessionId(record.sessionId);
        const active = requireAttached(sessionId);
        if (active.activeTurnId) {
          throw new StudioProtocolError(-32000, 'A turn is already running for this session.');
        }
        const content = parseTurnInput(record.input);
        const turnId = typeof record.turnId === 'string' && record.turnId ? record.turnId : createTurnId();
        const promptController = new AbortController();
        active.activeTurnId = turnId;
        active.activePromptController = promptController;
        const workspace = active.session.workspaceDir ?? defaultCwd;
        const submittedModeIntent = active.pendingModeIntent;
        active.activePromptTargetModeId =
          submittedModeIntent === 'plan-entry'
            ? ACP_MODE_PLAN
            : submittedModeIntent === 'plan-exit'
              ? ACP_MODE_DEFAULT
              : active.session.interactionMode === 'plan'
                ? ACP_MODE_PLAN
                : ACP_MODE_DEFAULT;

        void executeTuiInteractiveTurn({
          request: {
            turnId,
            session: Promise.resolve(active.session),
            content,
            workspace,
            version: options.version,
            ...(submittedModeIntent ? { clientIntent: submittedModeIntent } : {}),
          },
          coordinator: active.coordinator,
          isActive: () =>
            !promptController.signal.aborted &&
            sessions.get(sessionId) === active &&
            active.activeTurnId === turnId,
          onSessionEvent: (event) => emitTurnEvent(sessionId, turnId, event),
        })
          .then(async (result) => {
            if (sessions.get(sessionId) === active) {
              active.session = (await options.runtime.getSession(sessionId)) ?? active.session;
            }
            if (result.status === 'succeeded') emitTurnCompleted(sessionId, turnId, 'succeeded');
            else if (result.status === 'cancelled') emitTurnCompleted(sessionId, turnId, 'cancelled');
            else emitTurnCompleted(sessionId, turnId, 'failed', result.error);
          })
          .catch((error) => {
            emitTurnCompleted(
              sessionId,
              turnId,
              'failed',
              error instanceof Error ? error.message : 'Turn failed.',
            );
          })
          .finally(() => {
            if (active.activeTurnId === turnId) active.activeTurnId = undefined;
            if (active.activePromptController === promptController) {
              active.activePromptController = undefined;
            }
            active.activePromptTargetModeId = undefined;
            if (active.pendingModeIntent) active.pendingModeIntent = undefined;
          });

        return { turnId, sessionId };
      }
      case 'turn/watch': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const turnId = requireText(record.turnId, 'turnId');
        requireAttached(sessionId);
        const watchController = new AbortController();
        void (async () => {
          try {
            for await (const event of options.runtime.watchSessionTurn(
              sessionId,
              turnId,
              watchController.signal,
            )) {
              emitTurnEvent(sessionId, turnId, event);
              if (isSessionTurnTerminal(event)) break;
            }
          } catch {
            // Reconnect watch is best-effort and must not break the transport.
          }
        })();
        return { watching: true };
      }
      case 'turn/steer': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const text = requireText(record.text, 'text');
        const active = requireAttached(sessionId);
        const expectedTurnId = active.activeTurnId;
        if (!expectedTurnId) {
          throw new StudioProtocolError(-32602, 'Steering requires an active turn.');
        }
        const result = await options.runtime.steer({
          sessionId,
          source: 'api',
          message: { content: text },
          producerId: 'talos-studio',
          idempotencyKey:
            typeof record.clientRequestId === 'string' ? record.clientRequestId : createTurnId(),
          preDelivery: {
            accept: ({ mode, turnId }) => {
              if (mode !== 'steered' || turnId !== expectedTurnId || active.activeTurnId !== expectedTurnId) {
                throw new StudioProtocolError(-32602, 'Active turn changed before steering was admitted.');
              }
            },
          },
        });
        if (result.mode === 'activated') {
          throw new StudioProtocolError(-32602, 'Steering cannot activate a new turn.');
        }
        if (result.turnId !== expectedTurnId) {
          throw new StudioProtocolError(-32602, 'Steer result did not match the active turn.');
        }
        return { turnId: result.turnId, mode: result.mode };
      }
      case 'turn/cancel': {
        const record =
          params && typeof params === 'object'
            ? (params as { sessionId?: string; turnId?: string })
            : {};
        const sessionId = requireSessionId(record.sessionId);
        const active = requireAttached(sessionId);
        if (record.turnId && active.activeTurnId && record.turnId !== active.activeTurnId) {
          throw new StudioProtocolError(-32602, 'turnId does not match the active turn.');
        }
        active.activePromptController?.abort();
        await active.coordinator.abort();
        await options.runtime.abortSession({ id: sessionId });
        return { cancelled: true };
      }
      case 'permission/list': {
        const pending = await options.runtime.listPendingPermissions();
        return { permissions: pending };
      }
      case 'permission/reply': {
        const record =
          params && typeof params === 'object'
            ? (params as {
                agentName?: string;
                requestId?: string;
                decision?: string;
              })
            : {};
        if (
          typeof record.agentName !== 'string' ||
          typeof record.requestId !== 'string' ||
          typeof record.decision !== 'string'
        ) {
          throw new StudioProtocolError(-32602, 'agentName, requestId, and decision are required.');
        }
        const decision = record.decision;
        if (decision !== 'allowOnce' && decision !== 'allowAlways' && decision !== 'deny') {
          throw new StudioProtocolError(
            -32602,
            'decision must be allowOnce, allowAlways, or deny.',
          );
        }
        const ok = await options.runtime.replyPermission(
          record.agentName,
          record.requestId,
          decision,
        );
        return { accepted: ok };
      }
      case 'queue/list': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { items: await options.runtime.listQueuedMessages(sessionId) };
      }
      case 'queue/enqueue': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const text = requireText(record.text, 'text');
        requireAttached(sessionId);
        return await options.runtime.enqueueMessage(sessionId, text);
      }
      case 'queue/update': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const itemId = requireText(record.itemId, 'itemId');
        const text = requireText(record.text, 'text');
        requireAttached(sessionId);
        return {
          item:
            (await options.runtime.updateQueuedMessageContent(sessionId, itemId, text)) ?? null,
        };
      }
      case 'queue/delete': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const itemId = requireText(record.itemId, 'itemId');
        requireAttached(sessionId);
        return {
          item: (await options.runtime.deleteQueuedMessage(sessionId, itemId)) ?? null,
        };
      }
      case 'queue/steer': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const itemId = requireText(record.itemId, 'itemId');
        requireAttached(sessionId);
        return await options.runtime.steerQueuedMessage(sessionId, itemId);
      }
      case 'queue/continue': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        await options.runtime.continueQueue(sessionId);
        return { continued: true };
      }
      case 'goal/get': {
        if (!options.runtime.isGoalEnabled()) {
          throw new StudioProtocolError(-32602, 'Goal feature is disabled.');
        }
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { goal: (await options.runtime.getGoal(sessionId)) ?? null };
      }
      case 'goal/create': {
        if (!options.runtime.isGoalEnabled()) {
          throw new StudioProtocolError(-32602, 'Goal feature is disabled.');
        }
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        return {
          goal: await options.runtime.createGoal({
            sessionId,
            objective: requireText(record.objective, 'objective'),
            ...(record.tokenBudget !== undefined
              ? { tokenBudget: record.tokenBudget as number | null }
              : {}),
          }),
        };
      }
      case 'goal/patch': {
        if (!options.runtime.isGoalEnabled()) {
          throw new StudioProtocolError(-32602, 'Goal feature is disabled.');
        }
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        return {
          goal: await options.runtime.patchGoal(sessionId, {
            ...(record.status !== undefined
              ? { status: record.status as GlobalThreadGoal['status'] }
              : {}),
            ...(typeof record.objective === 'string' ? { objective: record.objective } : {}),
            ...(record.tokenBudget !== undefined
              ? { tokenBudget: record.tokenBudget as number | null }
              : {}),
          }),
        };
      }
      case 'goal/clear': {
        if (!options.runtime.isGoalEnabled()) {
          throw new StudioProtocolError(-32602, 'Goal feature is disabled.');
        }
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { cleared: await options.runtime.clearGoal(sessionId) };
      }
      case 'delegation/get': {
        const sessionId = requireSessionIdParam(params);
        const active = requireAttached(sessionId);
        const rootSessionId = await resolveRootSessionId(options.runtime, active.session);
        return { snapshot: await options.runtime.getDelegationSnapshot(rootSessionId) };
      }
      case 'delegation/stop': {
        const sessionId = requireSessionIdParam(params);
        const active = requireAttached(sessionId);
        const rootSessionId = await resolveRootSessionId(options.runtime, active.session);
        return { receipt: await options.runtime.stopDelegation(rootSessionId) };
      }
      case 'inspection/context': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { snapshot: await options.runtime.getContextSnapshot(sessionId) };
      }
      case 'inspection/usage': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { usage: await options.runtime.getSessionUsage(sessionId) };
      }
      case 'inspection/compact': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        const instructions =
          typeof record.instructions === 'string' ? record.instructions : undefined;
        return {
          result: await options.runtime.requestCompaction(sessionId, undefined, instructions),
        };
      }
      case 'inspection/skills': {
        const record = requireRecord(params);
        const sessionId = requireText(record.sessionId, 'sessionId');
        const active = requireAttached(sessionId);
        const workspace = active.session.workspaceDir ?? defaultCwd;
        const keyword = typeof record.keyword === 'string' ? record.keyword : undefined;
        return {
          skills: await options.runtime.listSkills(undefined, keyword, workspace),
        };
      }
      case 'inspection/mcp': {
        const record = requireRecord(params);
        const keyword = typeof record.keyword === 'string' ? record.keyword : undefined;
        const sessionId = typeof record.sessionId === 'string' ? record.sessionId : undefined;
        return { servers: await options.runtime.listMcpServers(keyword, sessionId) };
      }
      case 'inspection/diagnostics': {
        return { diagnostics: await options.runtime.getRuntimeDiagnostics() };
      }
      case 'inspection/instructionSources': {
        const record = requireRecord(params);
        const workspaceDir = record.workspaceDir ? requireCwd(record.workspaceDir) : defaultCwd;
        return { sources: await options.runtime.getInstructionSources(workspaceDir) };
      }
      case 'inspection/projectMcp': {
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { preview: await options.runtime.inspectProjectMcp(sessionId) };
      }
      case 'inspection/usageSummary': {
        if (!options.runtime.getSessionUsageSummary) {
          throw new StudioProtocolError(-32000, 'Session usage summary is not supported.');
        }
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { summary: await options.runtime.getSessionUsageSummary(sessionId) };
      }
      case 'plugins/listInstalled': {
        const record = requireRecord(params);
        const marketplace =
          record.marketplace === undefined
            ? undefined
            : parsePluginMarketplace(record.marketplace);
        return {
          plugins: await options.runtime.listInstalledPlugins(
            marketplace === undefined ? undefined : { marketplace },
          ),
        };
      }
      case 'plugins/listMarketplace': {
        const record = requireRecord(params);
        return {
          plugins: await options.runtime.listMarketplacePlugins({
            marketplace: parsePluginMarketplace(record.marketplace),
          }),
        };
      }
      case 'plugins/mutate': {
        const record = requireRecord(params);
        const action = requireText(record.action, 'action');
        if (
          action !== 'install' &&
          action !== 'remove' &&
          action !== 'enable' &&
          action !== 'disable'
        ) {
          throw new StudioProtocolError(-32602, 'action must be install, remove, enable, or disable.');
        }
        const plugin = record.plugin;
        if (!plugin || typeof plugin !== 'object') {
          throw new StudioProtocolError(-32602, 'plugin is required.');
        }
        const pluginRecord = plugin as { name?: string; marketplace?: unknown };
        const name = requireText(pluginRecord.name, 'plugin.name');
        return {
          result: await options.runtime.mutatePlugin({
            action,
            plugin: { name, marketplace: parsePluginMarketplace(pluginRecord.marketplace) },
          }),
        };
      }
      case 'plugins/refresh': {
        await options.runtime.refreshPlugins();
        return {};
      }
      case 'feedback/prepare': {
        const record = requireRecord(params);
        const description = requireText(record.description, 'description');
        const sessionId = typeof record.sessionId === 'string' ? record.sessionId : undefined;
        return {
          preview: await options.runtime.prepareFeedback({ description, sessionId }),
        };
      }
      case 'feedback/submit': {
        const record = requireRecord(params);
        const draftId = requireText(record.draftId, 'draftId');
        return { receipt: await options.runtime.submitFeedback(draftId) };
      }
      case 'feedback/cancel': {
        const record = requireRecord(params);
        const draftId = requireText(record.draftId, 'draftId');
        return { cancelled: await options.runtime.cancelFeedback(draftId) };
      }
      case 'checkin/run': {
        return { outcome: await options.runtime.runDailyCheckin() };
      }
      case 'workspace/git': {
        const record = requireRecord(params);
        const workspaceDir = record.workspaceDir ? requireCwd(record.workspaceDir) : defaultCwd;
        return { metadata: await options.runtime.getWorkspaceGitMetadata(workspaceDir) };
      }
      case 'workspace/files/list': {
        if (!options.runtime.listWorkspaceFileTree) {
          throw new StudioProtocolError(-32000, 'Workspace file listing is not supported.');
        }
        const record = requireRecord(params);
        const workspaceDir = record.workspaceDir ? requireCwd(record.workspaceDir) : defaultCwd;
        const path = typeof record.path === 'string' ? record.path : undefined;
        return {
          entries: await options.runtime.listWorkspaceFileTree(workspaceDir, path),
        };
      }
      case 'workspace/files/search': {
        if (!options.runtime.searchWorkspaceFiles) {
          throw new StudioProtocolError(-32000, 'Workspace file search is not supported.');
        }
        const record = requireRecord(params);
        const workspaceDir = record.workspaceDir ? requireCwd(record.workspaceDir) : defaultCwd;
        const query = requireText(record.query, 'query');
        const limit = typeof record.limit === 'number' ? record.limit : undefined;
        return {
          paths: await options.runtime.searchWorkspaceFiles(workspaceDir, query, limit),
        };
      }
      case 'workspace/files/candidates': {
        if (!options.runtime.listWorkspaceFileTreeCandidates) {
          throw new StudioProtocolError(-32000, 'Workspace file candidates are not supported.');
        }
        const record = requireRecord(params);
        if (!Array.isArray(record.roots)) {
          throw new StudioProtocolError(-32602, 'roots must be an array.');
        }
        const path = typeof record.path === 'string' ? record.path : undefined;
        return {
          entries: await options.runtime.listWorkspaceFileTreeCandidates({
            roots: record.roots as { path: string; label?: string; primary?: boolean }[],
            ...(path ? { path } : {}),
          }),
        };
      }
      case 'workspace/files/searchCandidates': {
        if (!options.runtime.searchWorkspaceFileCandidates) {
          throw new StudioProtocolError(-32000, 'Workspace file search candidates are not supported.');
        }
        const record = requireRecord(params);
        if (!Array.isArray(record.roots)) {
          throw new StudioProtocolError(-32602, 'roots must be an array.');
        }
        const query = requireText(record.query, 'query');
        const limit = typeof record.limit === 'number' ? record.limit : undefined;
        return {
          candidates: await options.runtime.searchWorkspaceFileCandidates({
            roots: record.roots as { path: string; label?: string; primary?: boolean }[],
            query,
            ...(limit !== undefined ? { limit } : {}),
          }),
        };
      }
      case 'backgroundTasks/list': {
        if (!options.runtime.listBackgroundTasks) {
          return { tasks: [] };
        }
        const sessionId = requireSessionIdParam(params);
        requireAttached(sessionId);
        return { tasks: await options.runtime.listBackgroundTasks(sessionId) };
      }
      case 'runtime/events/subscribe': {
        runtimeEventWatch?.abort();
        runtimeEventWatch = new AbortController();
        const signal = runtimeEventWatch.signal;
        void (async () => {
          try {
            for await (const event of options.runtime.watchEvents(signal)) {
              if (signal.aborted) return;
              sink.notify('runtime/event', { event });
            }
          } catch {
            // Auxiliary event stream must not corrupt the studio transport.
          }
        })();
        return {};
      }
      case 'runtime/events/unsubscribe': {
        runtimeEventWatch?.abort();
        runtimeEventWatch = undefined;
        return {};
      }
      case 'usage/commits/subscribe': {
        if (!options.runtime.watchSessionUsageCommits) {
          throw new StudioProtocolError(-32000, 'Session usage commit stream is not supported.');
        }
        usageCommitWatch?.abort();
        usageCommitWatch = new AbortController();
        const signal = usageCommitWatch.signal;
        void (async () => {
          try {
            for await (const sessionId of options.runtime.watchSessionUsageCommits!(signal)) {
              if (signal.aborted) return;
              sink.notify('usage/commit', { sessionId });
            }
          } catch {
            // Auxiliary usage stream must not corrupt the studio transport.
          }
        })();
        return {};
      }
      case 'usage/commits/unsubscribe': {
        usageCommitWatch?.abort();
        usageCommitWatch = undefined;
        return {};
      }
      case 'models/list': {
        const record = params && typeof params === 'object' ? (params as { sessionId?: string }) : {};
        const sessionId = typeof record.sessionId === 'string' ? record.sessionId : undefined;
        return { models: await options.runtime.listModels(sessionId) };
      }
      case 'account/status': {
        const record = requireRecord(params);
        const sessionId = typeof record.sessionId === 'string' ? record.sessionId : undefined;
        return { status: await options.runtime.getAccountStatus(sessionId) };
      }
      case 'questionnaire/getPending': {
        const record = requireRecord(params);
        const agentName = requireText(record.agentName, 'agentName');
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        return {
          request: await options.runtime.getPendingQuestionnaire(agentName, sessionId),
        };
      }
      case 'questionnaire/getPlanReview': {
        const record = requireRecord(params);
        const agentName = requireText(record.agentName, 'agentName');
        const sessionId = requireText(record.sessionId, 'sessionId');
        requireAttached(sessionId);
        return {
          request: await options.runtime.getLatestPlanReview(agentName, sessionId),
        };
      }
      case 'questionnaire/dismiss': {
        const record = requireRecord(params);
        const agentName = requireText(record.agentName, 'agentName');
        const requestId = requireText(record.requestId, 'requestId');
        return {
          dismissed: await options.runtime.dismissQuestionnaire(agentName, requestId),
        };
      }
      case 'questionnaire/reply': {
        const record = requireRecord(params);
        const agentName = requireText(record.agentName, 'agentName');
        const requestId = requireText(record.requestId, 'requestId');
        const answers = record.answers as TuiQuestionnaireReplyAnswer[];
        if (!Array.isArray(answers)) {
          throw new StudioProtocolError(-32602, 'answers must be an array.');
        }
        const accepted = await options.runtime.replyQuestionnaire(agentName, requestId, answers);
        return { accepted };
      }
      default:
        throw new StudioProtocolError(-32601, `Unknown method: ${method}`);
    }
  }

  return {
    async dispatch(raw: StudioJsonRpcRequest): Promise<void> {
      const id = raw.id ?? null;
      const method = raw.method;
      if (!method || typeof method !== 'string') {
        if (raw.id !== undefined) sink.respondError(id, -32600, 'Invalid Request');
        return;
      }
      if (raw.id === undefined) {
        try {
          await handleMethod(method, raw.params);
        } catch {
          // Notifications are fire-and-forget.
        }
        return;
      }
      try {
        const result = await handleMethod(method, raw.params);
        sink.respond(id, result);
      } catch (error) {
        if (error instanceof StudioProtocolError) {
          sink.respondError(id, error.code, error.message);
          return;
        }
        sink.respondError(
          id,
          -32000,
          error instanceof Error ? error.message : 'Studio server failed.',
        );
      }
    },
  };
}
