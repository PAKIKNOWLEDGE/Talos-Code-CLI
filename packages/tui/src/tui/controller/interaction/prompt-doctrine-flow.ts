import type { TuiSession, TuiSessionPort } from '../../../runtime/port.js';
import {
  formatTuiPromptDoctrine,
  type TuiPromptDoctrine,
} from '../../../application/prompt-doctrine.js';
import { formatTuiActionFailure } from '../../../user-facing-failure.js';

export interface TuiPromptDoctrineFlowOptions {
  readonly runtime: Pick<TuiSessionPort, 'setSessionPromptDoctrine'>;
  /** The active Session, or undefined before one exists. */
  readonly session: () => TuiSession | undefined;
  /** Doctrine held for the next Session, chosen before one exists. */
  readonly pendingDoctrine?: () => TuiPromptDoctrine | undefined;
  /**
   * Stores the choice a not-yet-created Session should start with. TUI only:
   * headless and delegated Sessions never pass through this flow.
   */
  readonly setPendingDoctrine?: (doctrine: TuiPromptDoctrine) => void;
  readonly append: (content: string, kind?: 'final-summary' | 'warning' | 'error') => void;
  readonly setHint: (message: string | undefined) => void;
  readonly onChanged: () => void;
  /** Re-reads the Session so the status line reflects the stored doctrine. */
  readonly onApplied?: (sessionId: string) => void | Promise<void>;
  readonly isStopped?: () => boolean;
}

/**
 * `/doctrine` command support.
 *
 * A Session renders one doctrine for its whole life: switching rewrites the
 * system prompt, which invalidates the cached prompt prefix. Before the Session
 * exists there is nothing cached, so the choice is held here and stamped by
 * `ensureSession`; after the first message the runtime lock owns the rule and
 * this flow only reports it.
 */
export class TuiPromptDoctrineFlow {
  private updatingValue = false;
  private mutationSequence = 0;
  private stopped = false;

  constructor(private readonly options: TuiPromptDoctrineFlowOptions) {}

  async set(nextDoctrine: TuiPromptDoctrine): Promise<void> {
    if (this.isStopped() || this.updatingValue) return;
    const session = this.options.session();
    if (!session) {
      // No Session and no request has been sent, so holding the choice costs
      // nothing: `ensureSession` stamps it at creation.
      const pending = this.options.pendingDoctrine?.();
      this.options.setPendingDoctrine?.(nextDoctrine);
      if (pending !== nextDoctrine) {
        this.options.append(
          `Behaviour doctrine · ${formatTuiPromptDoctrine(nextDoctrine)}. Applies when this Session is created.`,
        );
      }
      this.options.setHint(undefined);
      this.options.onChanged();
      return;
    }
    if (session.promptDoctrine === nextDoctrine) {
      this.showStatus();
      return;
    }
    this.updatingValue = true;
    const mutationSequence = ++this.mutationSequence;
    this.options.setHint(`Switching to ${formatTuiPromptDoctrine(nextDoctrine)}…`);
    this.options.onChanged();
    try {
      await this.options.runtime.setSessionPromptDoctrine(session.sessionId, nextDoctrine);
      if (this.isStopped() || mutationSequence !== this.mutationSequence) return;
      this.options.append(
        `Behaviour doctrine · ${formatTuiPromptDoctrine(nextDoctrine)}. Applies from this Session's first turn.`,
      );
      this.options.setHint(undefined);
      await this.refresh(session.sessionId);
    } catch (error) {
      if (this.isStopped() || mutationSequence !== this.mutationSequence) return;
      const anchored = session.promptDoctrine
        ? formatTuiPromptDoctrine(session.promptDoctrine)
        : 'its existing doctrine';
      this.options.append(
        formatTuiActionFailure(error, {
          summary: 'The behaviour doctrine was not changed.',
          nextStep: `This Session is anchored to ${anchored}.`,
        }),
        'warning',
      );
      this.options.setHint('Behaviour doctrine unchanged');
    } finally {
      if (!this.isStopped() && mutationSequence === this.mutationSequence) {
        this.updatingValue = false;
        this.options.onChanged();
      }
    }
  }

  /**
   * Re-reads the Session so the status line shows the stored doctrine. A failed
   * read leaves a stale line for one frame; it must not be reported as "the
   * change was rejected", because the change already landed.
   */
  private async refresh(sessionId: string): Promise<void> {
    try {
      await this.options.onApplied?.(sessionId);
    } catch {
      // Ignored on purpose; see above.
    }
  }

  showStatus(): void {
    const session = this.options.session();
    if (!session) {
      const pending = this.options.pendingDoctrine?.();
      this.options.append(
        pending
          ? `Behaviour doctrine: ${formatTuiPromptDoctrine(pending)} (applies when this Session is created). Choose with /doctrine apocalypse or /doctrine stargate.`
          : 'Behaviour doctrine: not chosen yet. config.yaml applies unless you choose with /doctrine apocalypse or /doctrine stargate.',
      );
      return;
    }
    const current = session.promptDoctrine
      ? formatTuiPromptDoctrine(session.promptDoctrine)
      : 'unset (follows config.yaml)';
    this.options.append(
      `Behaviour doctrine: ${current}. Choose with /doctrine apocalypse or /doctrine stargate; the choice is fixed once the Session has a message.`,
    );
  }

  /** Doctrine the next Session would start with: pending choice, else the active Session's. */
  current(): TuiPromptDoctrine | undefined {
    return this.options.session()?.promptDoctrine ?? this.options.pendingDoctrine?.();
  }

  stop(): void {
    this.stopped = true;
    this.mutationSequence += 1;
    this.updatingValue = false;
  }

  private isStopped(): boolean {
    return this.stopped || Boolean(this.options.isStopped?.());
  }
}
