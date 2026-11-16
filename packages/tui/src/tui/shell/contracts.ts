import type { TuiPermissionMode } from '../../application/permission-mode.js';
import type { TuiPromptDoctrine } from '../../application/prompt-doctrine.js';
import type { TuiTokenPlanQuota, TuiWorkspaceGitMetadata } from '../../runtime/port.js';
import type { TuiAgentStatus } from './status-protocol.js';
import type { TuiStatusLineItem } from './status-line-items.js';

export type TuiRuntimeStatus = 'starting' | 'ready' | 'offline' | 'error';

export interface TuiShellState {
  version: string;
  /**
   * Configured status line items, in display order. When omitted the status
   * line falls back to the default item order. Naming `build-mode` opts into
   * the machine-readable status protocol.
   */
  statusLineItems?: readonly TuiStatusLineItem[];
  workspace: string;
  workspaceGit?: TuiWorkspaceGitMetadata;
  runtimeStatus: TuiRuntimeStatus;
  agentStatus?: TuiAgentStatus;
  /** Base-36 sequence, incremented only when the machine-readable tuple changes. */
  agentSeq?: string;
  /** Raw ids are kept inside the TUI projection and hashed only while rendering `[V]`. */
  agentSessionId?: string;
  agentRunId?: string;
  agentRequestId?: string;
  /** Active delegated Sessions (queued/running/waiting) in the current root Session. */
  agentActiveCount?: number;
  /** All delegated Sessions currently projected for the current root Session. */
  agentTotalCount?: number;
  homeDir?: string;
  sessionTitle?: string;
  sessionRole?: 'root' | 'subagent';
  sessionAgentName?: string;
  parentSessionTitle?: string;
  model?: string;
  thinking?: 'on' | 'off';
  /** Think effort level of the selected model; absent when it exposes none. */
  effort?: string;
  accountStatus?: string;
  sessionCount?: number;
  /** Aggregate cache-read share of prompt tokens for the active Session. */
  sessionCacheReadRatio?: number;
  busy?: boolean;
  permissionMode?: TuiPermissionMode;
  permissionModeUpdating?: boolean;
  /**
   * Behaviour doctrine of the active Session. The Runtime fills the configured
   * value for Sessions created before the axis existed, so this is absent only
   * when no Session is active and the item renders silent.
   */
  promptDoctrine?: TuiPromptDoctrine;
  planMode?: 'default' | 'plan';
  planModeTransition?: 'next-message' | 'submitting';
  tokenPlanQuotaState?: 'available' | 'not-subscribed' | 'unavailable';
  tokenPlanQuota?: TuiTokenPlanQuota;
  /** Latest known context usage for the active Session. */
  contextUsage?: TuiShellContextUsage;
  /** Current Session window, or the welcome model selection; used when usage omits one. */
  contextWindowTokens?: number;
  /**
   * Latest successful output of the configured custom status command (first
   * stdout line). Absent until a run succeeds; an empty string means the last
   * run deliberately blanked the item.
   */
  customStatusText?: string;
}

/** Minimal context usage projection the status line needs. */
export interface TuiShellContextUsage {
  readonly usedTokens: number;
  readonly contextWindowTokens?: number;
}
