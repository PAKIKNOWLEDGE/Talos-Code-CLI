export const TALOS_WELCOME_PASTE_IMAGE_SHORTCUT = '{paste-image-shortcut}';
const TALOS_WELCOME_CHECKIN_TIP = '/checkin claims the daily reward.';

export const TALOS_WELCOME_DESIGN = {
  sectionTitles: {
    tips: 'Field notes',
    news: 'System notes · /changelog for history',
  },
  tipPool: [
    'Say what you want and how to verify it.',
    `Use @ for files; ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} for images.`,
    'Run /init to map this repo.',
    'Use /plan before a change that needs design or investigation.',
    'Use /context to check the current session context budget.',
    'Use /sessions to resume earlier work.',
    'Use /history to review and branch from earlier prompts.',
    'Use /goal to keep long-running work focused on a finish line.',
    'Use /permission to choose how tool approvals are handled.',
    'Use /feedback to preview a redacted report before upload.',
    TALOS_WELCOME_CHECKIN_TIP,
  ],
  wide: {
    tips: [
      'Say what you want and how to verify it.',
      `Use @ for files; ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} for images.`,
      'Run /init to map this repo.',
      TALOS_WELCOME_CHECKIN_TIP,
    ],
    news: [
      'Send follow-ups while Talos works.',
      '/context shows read-only session context.',
      '/feedback previews before upload.',
    ],
  },
  stacked: {
    tips: [
      'Say what you want and how to verify it.',
      `@ files · ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} images · /init guidance`,
      '/checkin daily reward',
    ],
    news: ['Follow-ups wait while Talos works.', '/context budget · /feedback preview'],
  },
  compact: {
    tips: [
      `@ files · ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} images`,
      '/init repo guidance',
      '/checkin reward',
    ],
    news: ['Follow-ups wait', '/context · /feedback'],
  },
  hero: {
    fullMinWidth: 32,
    mediumMinWidth: 20,
    microMinWidth: 10,
    fallbackTitle: 'T',
  },
} as const;

const TALOS_ASCII_FONT = {
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  A: [' ### ', '#   #', '#####', '#   #', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#####'],
  O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
  S: [' ####', '#    ', ' ### ', '    #', '#### '],
} as const;

function composeTalosAsciiWordmark(): readonly string[] {
  return Array.from({ length: 5 }, (_, row) =>
    (['T', 'A', 'L', 'O', 'S'] as const)
      .map((letter) => TALOS_ASCII_FONT[letter][row])
      .join(' ')
      .trimEnd(),
  );
}

export const TALOS_TERMINAL_ASCII_WORDMARK = composeTalosAsciiWordmark();

export const TALOS_TERMINAL_ARM = [
  '       ▄',
  '   ▄▄██▀█▄',
  ' ▄████████▄',
  '███████████',
  ' ███  ▀█▀',
  '  ██  ▀█▀',
  '  ▀██▄',
  ' ▄████▄',
] as const;

export const TALOS_TERMINAL_ARM_COMPACT = [
  '   ▄',
  ' ▄███▄',
  '██████',
  ' ██▀█▀',
  ' ▄██▄',
] as const;

export const TALOS_TERMINAL_ARM_MICRO = [' ▄ ', '███', '▀█▀'] as const;

// Compatibility aliases keep the upstream module surface stable while the
// visible welcome screen moves to Talos assets.
export const MINIMAX_CODE_WELCOME_PASTE_IMAGE_SHORTCUT = TALOS_WELCOME_PASTE_IMAGE_SHORTCUT;
export const MINIMAX_CODE_WELCOME_DESIGN = TALOS_WELCOME_DESIGN;
export const MINIMAX_CODE_TERMINAL_WORDMARK = TALOS_TERMINAL_ARM;
export const MINIMAX_CODE_TERMINAL_MEDIUM_WORDMARK = TALOS_TERMINAL_ARM_COMPACT;
export const MINIMAX_CODE_TERMINAL_MICRO_WORDMARK = TALOS_TERMINAL_ARM_MICRO;
