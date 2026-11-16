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
 * The runtime owns the lock: it rejects a change once the Session has a user
 * message (`local_prompt_doctrine_locked`). This flow does not pre-judge that,
 * because a second copy of the rule would drift; it surfaces the rejection and
 * says where a doctrine can still be chosen.
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
      this.options.append('Start or resume a Session before choosing a doctrine.', 'warning');
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
        `Behaviour doctrine · ${formatTuiPromptDoctrine(nextDoctrine)}. Applies to this Session's next turn.`,
      );
      this.options.setHint(undefined);
      await this.refresh(session.sessionId);
    } catch (error) {
      if (this.isStopped() || mutationSequence !== this.mutationSequence) return;
      this.options.append(
        formatTuiActionFailure(error, {
          summary: 'The behaviour doctrine was not changed.',
          nextStep: 'A doctrine is fixed once the Session has a message; choose one in a new Session.',
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
      this.options.append('Start or resume a Session before choosing a doctrine.');
      return;
    }
    const current = session.promptDoctrine
      ? formatTuiPromptDoctrine(session.promptDoctrine)
      : 'unset (follows config.yaml)';
    this.options.append(
      `Behaviour doctrine: ${current}. Choose with /doctrine apocalypse or /doctrine stargate; the choice is fixed once the Session has a message.`,
    );
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
