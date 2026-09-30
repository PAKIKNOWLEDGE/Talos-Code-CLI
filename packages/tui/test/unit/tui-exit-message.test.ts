import { describe, expect, it } from 'vitest';
import { formatTuiExitMessage } from '../../src/tui/launcher.js';

describe('Talos TUI exit message', () => {
  it('uses the Talos offline slogan without a session hint', () => {
    expect(formatTuiExitMessage()).toBe('\n-- 3NDM1N15T4T0R OFFL1NE --\n');
  });

  it('keeps the session continuation hint before the slogan', () => {
    expect(formatTuiExitMessage('session-123')).toBe(
      '\nContinue this session with:\n  talos --session session-123\n\n-- 3NDM1N15T4T0R OFFL1NE --\n',
    );
  });
});
