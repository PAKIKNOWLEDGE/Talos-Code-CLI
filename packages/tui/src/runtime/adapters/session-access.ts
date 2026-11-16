import {
  SessionTypeView,
  type CliService,
  type SessionInfoView,
  type SessionTreeChildView,
} from '@mavis/local-runtime-v2/cli-service';

import type {
  CreateTuiSessionInput,
  ForkTuiSessionInput,
  ListTuiSessionPageInput,
  ListTuiSessionsOptions,
  TuiMessagePage,
  TuiMessagePageInput,
  TuiModelSelection,
  TuiPromptDoctrine,
  TuiEditMessageInput,
  TuiEditMessageResult,
  TuiRewindInput,
  TuiRewindPreview,
  TuiRewindResult,
  TuiSession,
  TuiSessionForkOptions,
  TuiSessionForkResult,
  TuiSessionInputSummary,
  TuiSessionMcpServer,
  TuiSessionPage,
} from '../port.js';
import {
  normalizeTuiEditMessageResult,
  normalizeSessionInfoView,
  normalizeSessionInputSummaries,
  normalizeTuiRewindPreview,
  normalizeTuiRewindResult,
} from './normalizers.js';
import { normalizeTuiMessage, type TuiMessage } from '../stream-events.js';

export class TuiSessionAccess {
  constructor(
    private readonly cliService: CliService,
    private readonly defaultAgentName: string,
    private readonly onSessionDeleted?: (sessionId: string) => void | Promise<void>,
    /**
     * Configured doctrine, used only for Sessions that predate the axis. The
     * runtime still enforces those from configuration, so the status line would
     * under-report the effective doctrine if it trusted the record alone.
     */
    private readonly promptDoctrineFallback?: () => TuiPromptDoctrine | undefined,
  ) {}

  /**
   * Normalizes one Session view, filling the doctrine a legacy record cannot
   * carry. A record that does store one always wins: it is the locked value.
   */
  private normalize(view: SessionInfoView): TuiSession {
    const session = normalizeSessionInfoView(view);
    if (session.promptDoctrine) return session;
    const fallback = this.promptDoctrineFallback?.();
    return fallback ? { ...session, promptDoctrine: fallback } : session;
  }

  private requireSession(
    view: SessionInfoView | undefined,
    fallbackSessionId: string | undefined,
  ): TuiSession {
    if (view) return this.normalize(view);
    if (fallbackSessionId) {
      const fallback = this.promptDoctrineFallback?.();
      return { sessionId: fallbackSessionId, ...(fallback ? { promptDoctrine: fallback } : {}) };
    }
    throw new Error('Runtime did not return the created Session.');
  }

  private normalizePage(
    response: { sessions: SessionInfoView[]; hasMore: boolean; nextCursor?: string },
    workspaceDir?: string,
  ): TuiSessionPage {
    const sessions = response.sessions
      .map((view) => this.normalize(view))
      .filter((session) => !workspaceDir || session.workspaceDir === workspaceDir);
    return sessionPageFromResponse(sessions, response);
  }

  async createSession(
    input: CreateTuiSessionInput,
    defaultModel?: TuiModelSelection,
  ): Promise<TuiSession> {
    const response = await this.cliService.createSession({
      name: this.defaultAgentName,
      workspaceDir: input.workspaceDir,
      ...(input.title ? { title: input.title } : {}),
      ...(input.parentSessionId ? { parentSessionId: input.parentSessionId } : {}),
      ...(input.visibility ? { visibility: input.visibility } : {}),
      ...(input.purpose ? { purpose: input.purpose } : {}),
      ...(input.promptDoctrine ? { promptDoctrine: input.promptDoctrine } : {}),
      ...(defaultModel
        ? {
            model: {
              providerId: defaultModel.providerId,
              modelId: defaultModel.modelId,
              ...(defaultModel.variant !== undefined ? { variant: defaultModel.variant } : {}),
              ...(defaultModel.contextLimit !== undefined
                ? { contextLimit: defaultModel.contextLimit }
                : {}),
              // Runtime only stores an effort it is given; dropping it here made
              // the first Turn run at the provider default while the status line
              // already showed the resolved level.
              ...(defaultModel.thinking?.effort?.trim()
                ? { thinking: { effort: defaultModel.thinking.effort.trim() } }
                : {}),
            },
          }
        : {}),
    });
    const session = this.requireSession(response.session, response.sessionId);
    if (input.mcpServers?.length) {
      await this.configureSessionMcpServers(session.sessionId, input.mcpServers);
    }
    return session;
  }

  async configureSessionMcpServers(
    sessionId: string,
    servers: readonly TuiSessionMcpServer[],
  ): Promise<void> {
    await this.cliService.configureSessionMcpServers({
      sessionId,
      servers: servers.map((server) =>
        server.type === 'stdio'
          ? {
              name: server.name,
              config: {
                type: server.type,
                command: server.command,
                args: [...server.args],
                ...(server.env ? { env: { ...server.env } } : {}),
              },
            }
          : {
              name: server.name,
              config: {
                type: server.type,
                url: server.url,
                ...(server.headers ? { headers: { ...server.headers } } : {}),
              },
            },
      ),
    });
  }

  clearSessionMcpServers(sessionId: string): Promise<void> {
    return this.cliService.clearSessionMcpServers(sessionId);
  }

  async listSessions(
    agentName = this.defaultAgentName,
    options: ListTuiSessionsOptions = {},
  ): Promise<TuiSession[]> {
    const response = await this.cliService.listSessions({ name: agentName, ...options });
    return (response.sessions ?? []).map((view) => this.normalize(view));
  }

  async listSessionPage(
    inputOrAgentName: ListTuiSessionPageInput | string = {},
    legacyOptions: ListTuiSessionsOptions = {},
  ): Promise<TuiSessionPage> {
    const input =
      typeof inputOrAgentName === 'string'
        ? { ...legacyOptions, agentName: inputOrAgentName }
        : inputOrAgentName;
    const {
      allAgents = false,
      agentName: requestedAgentName,
      workspaceDir,
      ...pageOptions
    } = input;
    const agentName = requestedAgentName ?? this.defaultAgentName;
    const loadPage = (options: ListTuiSessionsOptions) =>
      allAgents
        ? this.listSessionTree(agentName, options)
        : this.listAgentSessions(agentName, options);
    if (!workspaceDir) return this.normalizePage(await loadPage(pageOptions));

    let cursor = pageOptions.cursor;
    const seenCursors = new Set<string>(cursor ? [cursor] : []);
    const requestedLimit =
      pageOptions.limit !== undefined && pageOptions.limit > 0 ? pageOptions.limit : undefined;
    const sessions: TuiSession[] = [];
    for (;;) {
      const response = await loadPage({
        ...pageOptions,
        ...(requestedLimit ? { limit: Math.max(1, requestedLimit - sessions.length) } : {}),
        ...(cursor ? { cursor } : {}),
      });
      const page = this.normalizePage(response, workspaceDir);
      sessions.push(...page.sessions);
      const filled = requestedLimit ? sessions.length >= requestedLimit : sessions.length > 0;
      if (filled || !response.hasMore) return sessionPageFromResponse(sessions, response);
      if (!response.nextCursor) return { sessions, hasMore: false };
      if (seenCursors.has(response.nextCursor)) return { sessions, hasMore: false };
      seenCursors.add(response.nextCursor);
      cursor = response.nextCursor;
    }
  }

  async getSession(sessionId: string): Promise<TuiSession> {
    const response = await this.cliService.getSession({ id: sessionId });
    if (!response.session) throw new Error(`Runtime did not return session ${sessionId}.`);
    return this.normalize(response.session);
  }

  async getMessages(sessionId: string, limit = 80): Promise<TuiMessage[]> {
    return (await this.listMessagePage(sessionId, { limit })).messages;
  }

  async listMessagePage(
    sessionId: string,
    input: TuiMessagePageInput = {},
  ): Promise<TuiMessagePage> {
    const response = await this.cliService.getMessages({
      id: sessionId,
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
      ...(input.before ? { before: input.before } : {}),
    });
    return {
      messages: (response.messages ?? []).map((message) => normalizeTuiMessage(message)),
      hasMore: response.hasMore === true,
      ...(response.nextCursor ? { nextCursor: response.nextCursor } : {}),
    };
  }

  async getSessionForkOptions(
    sessionId: string,
    assistantMessageId?: string,
  ): Promise<TuiSessionForkOptions> {
    return this.cliService.getSessionForkOptions({
      id: sessionId,
      ...(assistantMessageId ? { assistantMessageId } : {}),
    });
  }

  async forkSession(input: ForkTuiSessionInput): Promise<TuiSessionForkResult> {
    const response = await this.cliService.forkSession({
      id: input.sessionId,
      ...(input.assistantMessageId ? { assistantMessageId: input.assistantMessageId } : {}),
      clientRequestId: input.clientRequestId,
      ...(input.title ? { title: input.title } : {}),
      useSuggestedTitle: input.useSuggestedTitle,
      createIsolatedWorktree: input.createIsolatedWorktree,
    });
    return {
      session: this.requireSession(response.session, undefined),
      ...(response.forkOriginMessageId
        ? { forkOriginMessageId: response.forkOriginMessageId }
        : {}),
      ...(response.sourceDisplayMessageId
        ? { sourceDisplayMessageId: response.sourceDisplayMessageId }
        : {}),
      ...(response.displayRevision ? { displayRevision: response.displayRevision } : {}),
      ...(response.historyRevision ? { historyRevision: response.historyRevision } : {}),
    };
  }

  async renameSession(sessionId: string, title: string): Promise<TuiSession> {
    const response = await this.cliService.updateSession({ id: sessionId, title });
    return this.requireSession(response.session, sessionId);
  }

  async setSessionPromptDoctrine(
    sessionId: string,
    doctrine: TuiPromptDoctrine,
  ): Promise<TuiSession> {
    const response = await this.cliService.updateSession({
      id: sessionId,
      promptDoctrine: doctrine,
    });
    return this.requireSession(response.session, sessionId);
  }

  async archiveSession(sessionId: string, archived: boolean): Promise<void> {
    await this.cliService.archiveSession({ id: sessionId, archived });
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.onSessionDeleted?.(sessionId);
    await this.cliService.deleteSession({ id: sessionId });
  }

  async listSessionInputSummaries(
    sessionId: string,
    input: { limit?: number; before?: string } = {},
  ): Promise<readonly TuiSessionInputSummary[]> {
    let before = input.before;
    const seenCursors = new Set<string>(before ? [before] : []);
    let summaries: TuiSessionInputSummary[] = [];
    for (;;) {
      const response = await this.cliService.listSessionInputSummaries({
        id: sessionId,
        ...(input.limit !== undefined ? { limit: input.limit } : {}),
        ...(before ? { before } : {}),
      });
      const page = normalizeSessionInputSummaries(response.summaries);
      summaries = [...page, ...summaries];
      if (!response.hasMore || !response.nextCursor || seenCursors.has(response.nextCursor)) {
        return summaries;
      }
      seenCursors.add(response.nextCursor);
      before = response.nextCursor;
    }
  }

  async getSessionRewindPreview(input: {
    sessionId: string;
    userMessageId: string;
  }): Promise<TuiRewindPreview> {
    const response = await this.cliService.getSessionRewindPreview({
      id: input.sessionId,
      userMessageId: input.userMessageId,
    });
    return normalizeTuiRewindPreview(response);
  }

  async rewindSession(input: TuiRewindInput): Promise<TuiRewindResult> {
    const response = await this.cliService.rewindSession({
      id: input.sessionId,
      userMessageId: input.userMessageId,
      clientRequestId: input.clientRequestId,
      ...(input.rewindTurnDiff ? { rewindTurnDiff: true } : {}),
    });
    return normalizeTuiRewindResult(response);
  }

  async editSessionMessage(input: TuiEditMessageInput): Promise<TuiEditMessageResult> {
    const response = await this.cliService.editSessionMessage({
      id: input.sessionId,
      userMessageId: input.userMessageId,
      clientRequestId: input.clientRequestId,
      content: input.content,
      ...(input.attachments
        ? {
            attachments: input.attachments.map((attachment) => ({
              meta: {
                attachmentType: attachment.type,
                fileName: attachment.fileName,
                mimeType: attachment.mimeType,
                ...(attachment.sizeBytes !== undefined ? { sizeBytes: attachment.sizeBytes } : {}),
              },
              local: {
                ...(attachment.filePath ? { filePath: attachment.filePath } : {}),
                ...(attachment.assetId ? { assetId: attachment.assetId } : {}),
              },
            })),
          }
        : {}),
      ...(input.rewindTurnDiff ? { rewindTurnDiff: true } : {}),
    });
    return normalizeTuiEditMessageResult(response);
  }

  private async listAgentSessions(
    agentName: string,
    options: ListTuiSessionsOptions,
  ): Promise<{ sessions: SessionInfoView[]; hasMore: boolean; nextCursor?: string }> {
    const response = await this.cliService.listSessions({ name: agentName, ...options });
    return {
      sessions: response.sessions ?? [],
      hasMore: response.hasMore === true,
      ...(response.nextCursor ? { nextCursor: response.nextCursor } : {}),
    };
  }

  private async listSessionTree(
    agentName: string,
    options: ListTuiSessionsOptions,
  ): Promise<{ sessions: SessionInfoView[]; hasMore: boolean; nextCursor?: string }> {
    const response = await this.cliService.getSessionTree({ name: agentName, ...options });
    return {
      sessions: (response.sessions ?? []).flatMap((node) => {
        const root = node.session ? [node.session] : [];
        const parentSessionId = node.session?.sessionId;
        if (!parentSessionId) return root;
        return [
          ...root,
          ...(node.childSessions ?? []).map((child) =>
            toBranchSessionInfoView(child, parentSessionId),
          ),
        ];
      }),
      hasMore: response.hasMore === true,
      ...(response.nextCursor ? { nextCursor: response.nextCursor } : {}),
    };
  }
}

function sessionPageFromResponse(
  sessions: TuiSession[],
  response: { hasMore: boolean; nextCursor?: string },
): TuiSessionPage {
  return {
    sessions,
    hasMore: response.hasMore === true,
    ...(response.nextCursor ? { nextCursor: response.nextCursor } : {}),
  };
}

function toBranchSessionInfoView(
  child: SessionTreeChildView,
  parentSessionId: string,
): SessionInfoView {
  return { ...child, sessionType: SessionTypeView.Branch, parentSessionId };
}
