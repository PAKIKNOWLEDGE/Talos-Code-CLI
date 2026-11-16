import { describe, expect, it, vi } from 'vitest';

import { TuiPromptDoctrineFlow } from '../../src/tui/controller/interaction/prompt-doctrine-flow.js';
import type { TuiSession } from '../../src/runtime/port.js';

function createFlow(
  options: {
    readonly session?: TuiSession | undefined;
    readonly setSessionPromptDoctrine?: (
      sessionId: string,
      doctrine: 'apocalypse' | 'stargate',
    ) => Promise<TuiSession>;
    readonly onApplied?: (sessionId: string) => void | Promise<void>;
  } = {},
) {
  const setSessionPromptDoctrine = vi.fn(
    options.setSessionPromptDoctrine ?? (async () => ({ sessionId: 'session-1' })),
  );
  const append = vi.fn();
  const setHint = vi.fn();
  const onChanged = vi.fn();
  const onApplied = vi.fn(options.onApplied ?? (() => undefined));
  const flow = new TuiPromptDoctrineFlow({
    runtime: { setSessionPromptDoctrine },
    session: () => ('session' in options ? options.session : { sessionId: 'session-1' }),
    append,
    setHint,
    onChanged,
    onApplied,
  });
  return { flow, setSessionPromptDoctrine, append, setHint, onChanged, onApplied };
}

describe('prompt doctrine flow', () => {
  it('asks for a Session instead of calling the runtime', async () => {
    const { flow, setSessionPromptDoctrine, append } = createFlow({ session: undefined });

    await flow.set('stargate');

    expect(setSessionPromptDoctrine).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(
      'Start or resume a Session before choosing a doctrine.',
      'warning',
    );
  });

  it('applies a different doctrine and re-reads the Session', async () => {
    const { flow, setSessionPromptDoctrine, onApplied, append } = createFlow({
      session: { sessionId: 'session-1', promptDoctrine: 'apocalypse' },
    });

    await flow.set('stargate');

    expect(setSessionPromptDoctrine).toHaveBeenCalledWith('session-1', 'stargate');
    expect(onApplied).toHaveBeenCalledWith('session-1');
    expect(append).toHaveBeenCalledWith(
      "Behaviour doctrine · Stargate. Applies to this Session's next turn.",
    );
  });

  it('reports the current doctrine instead of re-saving the same value', async () => {
    const { flow, setSessionPromptDoctrine, append } = createFlow({
      session: { sessionId: 'session-1', promptDoctrine: 'stargate' },
    });

    await flow.set('stargate');

    expect(setSessionPromptDoctrine).not.toHaveBeenCalled();
    expect(append.mock.calls[0]?.[0]).toContain('Behaviour doctrine: Stargate.');
  });

  it('surfaces the runtime lock without retrying', async () => {
    const locked = Object.assign(new Error('The behaviour doctrine is fixed'), {
      status: 409,
      key: 'local_prompt_doctrine_locked',
    });
    const { flow, setSessionPromptDoctrine, append, setHint, onApplied } = createFlow({
      session: { sessionId: 'session-1', promptDoctrine: 'apocalypse' },
      setSessionPromptDoctrine: async () => {
        throw locked;
      },
    });

    await flow.set('stargate');

    expect(setSessionPromptDoctrine).toHaveBeenCalledTimes(1);
    expect(onApplied).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith(expect.stringContaining('not changed'), 'warning');
    expect(setHint).toHaveBeenLastCalledWith('Behaviour doctrine unchanged');
  });

  it('reports an unrecorded doctrine as following configuration', () => {
    const { flow, append } = createFlow({ session: { sessionId: 'session-1' } });

    flow.showStatus();

    expect(append.mock.calls[0]?.[0]).toContain('unset (follows config.yaml)');
  });

  it('keeps the success line when the follow-up re-read fails', async () => {
    const { flow, append, setHint } = createFlow({
      session: { sessionId: 'session-1', promptDoctrine: 'apocalypse' },
      onApplied: () => {
        throw new Error('Runtime did not return the Session.');
      },
    });

    await flow.set('stargate');

    expect(append).toHaveBeenCalledWith(
      "Behaviour doctrine · Stargate. Applies to this Session's next turn.",
    );
    expect(append).not.toHaveBeenCalledWith(expect.stringContaining('not changed'), 'warning');
    expect(setHint).toHaveBeenLastCalledWith(undefined);
  });
});
