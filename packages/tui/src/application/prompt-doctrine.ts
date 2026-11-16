import { PROMPT_DOCTRINES, type PromptDoctrine } from '@mavis/config';

/**
 * Behaviour doctrine composed into the TUI system prompt. The value set is owned
 * by `@mavis/config`; the TUI only adds the labels it renders.
 */
export type TuiPromptDoctrine = PromptDoctrine;

const PROMPT_DOCTRINE_LABELS: Record<TuiPromptDoctrine, string> = {
  apocalypse: 'Apocalypse',
  stargate: 'Stargate',
};

const PROMPT_DOCTRINE_COMPACT_LABELS: Record<TuiPromptDoctrine, string> = {
  apocalypse: 'APOC',
  stargate: 'STAR',
};

export function normalizeTuiPromptDoctrine(value: unknown): TuiPromptDoctrine | undefined {
  return PROMPT_DOCTRINES.find((doctrine) => doctrine === value);
}

export function formatTuiPromptDoctrine(doctrine: TuiPromptDoctrine): string {
  return PROMPT_DOCTRINE_LABELS[doctrine];
}

export function formatTuiPromptDoctrineCompact(doctrine: TuiPromptDoctrine): string {
  return PROMPT_DOCTRINE_COMPACT_LABELS[doctrine];
}
