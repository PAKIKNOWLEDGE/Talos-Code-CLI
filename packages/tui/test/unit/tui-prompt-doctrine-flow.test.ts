import { describe, expect, it, vi } from 'vitest';

import { TuiPromptDoctrineFlow } from '../../src/tui/controller/interaction/prompt-doctrine-flow.js';
import type { TuiSession } from '../../src/runtime/port.js';

function createFlow(
  options: {
    readonly session?: TuiSession | undefined;
    readonly pending?: 'apocalypse' | 'stargate' | undefined;
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
  let pending = options.pending;
  const setPendingDoctrine = vi.fn((next: 'apocalypse' | 'stargate') => {
    pending = next;
  });
  const append = vi.fn();
  const setHint = vi.fn();
  const onChanged = vi.fn();
  const onApplied = vi.fn(options.onApplied ?? (() => undefined));
  const flow = new TuiPromptDoctrineFlow({
    runtime: { setSessionPromptDoctrine },
    session: () => ('session' in options ? options.session : { sessionId: 'session-1' }),
    pendingDoctrine: () => pending,
    setPendingDoctrine,
    append,
    setHint,
    onChanged,
    onApplied,
  });
  return { flow, setSessionPromptDoctrine, setPendingDoctrine, append, setHint, onChanged, onApplied };
}

describe('prompt doctrine flow', () => {
  it('holds the choice for the Session that has not been created yet', async () => {
    const { flow, setSessionPromptDoctrine, setPendingDoctrine, append } = createFlow({
      session: undefined,
    });

    await flow.set('stargate');

    expect(setSessionPromptDoctrine).not.toHaveBeenCalled();
    expect(setPendingDoctrine).toHaveBeenCalledWith('stargate');
    expect(append).toHaveBeenCalledWith(
      'Behaviour doctrine · Stargate. Applies when this Session is created.',
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
      "Behaviour doctrine · Stargate. Applies from this Session's first turn.",
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

  it('surfaces the runtime lock as an anchored Session without retrying', async () => {
    const locked = Object.assign(new Error('The behaviour doctrine is anchored'), {
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
    expect(append).toHaveBeenCalledWith(
      expect.stringContaining('This Session is anchored to Apocalypse'),
      'warning',
    );
    expect(append).not.toHaveBeenCalledWith(expect.stringContaining('new Session'), 'warning');
    expect(setHint).toHaveBeenLastCalledWith('Behaviour doctrine unchanged');
  });

  it('reports the pending choice before a Session exists', () => {
    const { flow, append } = createFlow({ session: undefined, pending: 'stargate' });

    flow.showStatus();

    expect(append.mock.calls[0]?.[0]).toContain('Behaviour doctrine: Stargate');
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
      "Behaviour doctrine · Stargate. Applies from this Session's first turn.",
    );
    expect(append).not.toHaveBeenCalledWith(expect.stringContaining('not changed'), 'warning');
    expect(setHint).toHaveBeenLastCalledWith(undefined);
  });
});
