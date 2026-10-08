import { describe, expect, it } from 'vitest';

import {
  buildAgentContextBlock,
  buildSlimAgentContextBlock,
} from './blocks.js';
import type { AgentEnv } from './types.js';

function localPrimaryAgentEnv(): AgentEnv {
  return {
    workspaceDir: '/tmp/workspace',
    agentConfigDir: '/tmp/.talos/agents/mavis',
    agentName: 'mavis',
    agentRole: 'orchestrator',
    displayName: 'Perlica',
    sessionId: 'ses_identity_test',
    sessionType: 1,
    platform: 'win32',
    scene: 'local',
    date: '2026-10-08',
  };
}

describe('agent-context identity surfacing', () => {
  it('does not inject routing labels into the first-turn local agent-context', () => {
    const block = buildAgentContextBlock(localPrimaryAgentEnv());
    expect(block).toContain('agent: Perlica');
    expect(block).toContain('SESSION ROLE:');
    expect(block).not.toContain('agentName: mavis');
    expect(block).not.toContain('agentRole: orchestrator');
    expect(block).not.toMatch(/\bMavis\b/);
  });

  it('does not inject routing labels into the slim local agent-context', () => {
    const block = buildSlimAgentContextBlock(localPrimaryAgentEnv());
    expect(block).toContain('agent: Perlica');
    expect(block).toContain('SESSION ROLE:');
    expect(block).not.toContain('agentName: mavis');
    expect(block).not.toContain('agentRole: orchestrator');
    expect(block).not.toMatch(/\bMavis\b/);
  });
});
