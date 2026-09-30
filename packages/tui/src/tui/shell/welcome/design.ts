export const TALOS_WELCOME_PASTE_IMAGE_SHORTCUT = '{paste-image-shortcut}';
const TALOS_WELCOME_PROVIDER_TIP = '/provider manages model connections.';

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
    'Use /doctor to inspect local runtime diagnostics.',
    TALOS_WELCOME_PROVIDER_TIP,
  ],
  wide: {
    tips: [
      'Say what you want and how to verify it.',
      `Use @ for files; ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} for images.`,
      'Run /init to map this repo.',
      TALOS_WELCOME_PROVIDER_TIP,
    ],
    news: [
      'Send follow-ups while Talos works.',
      '/context shows read-only session context.',
      '/doctor shows local diagnostics.',
    ],
  },
  stacked: {
    tips: [
      'Say what you want and how to verify it.',
      `@ files · ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} images · /init guidance`,
      '/provider model connections',
    ],
    news: ['Follow-ups wait while Talos works.', '/context budget · /doctor diagnostics'],
  },
  compact: {
    tips: [
      `@ files · ${TALOS_WELCOME_PASTE_IMAGE_SHORTCUT} images`,
      '/init repo guidance',
      '/provider models',
    ],
    news: ['Follow-ups wait', '/context · /doctor'],
  },
  hero: {
    fullMinWidth: 64,
    mediumMinWidth: 20,
    microMinWidth: 10,
    fallbackTitle: 'T',
  },
} as const;

// Generated from the reviewed ANSI Shadow style source at C:\DEV\develop\tmp\ANSI.txt.
// Keep the result as literal Unicode rows so the runtime needs no font package.
export const TALOS_TERMINAL_ASCII_WORDMARK = [
  '████████╗ █████╗ ██╗      ██████╗ ███████╗',
  '╚══██╔══╝██╔══██╗██║     ██╔═████╗██╔════╝',
  '   ██║   ███████║██║     ██║██╔██║███████╗',
  '   ██║   ██╔══██║██║     ████╔╝██║╚════██║',
  '   ██║   ██║  ██║███████╗╚██████╔╝███████║',
  '   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚══════╝',
] as const;

export const TALOS_TERMINAL_EMBLEM = [
  '      /----\\',
  '     /######\\',
  '     \\######/',
  '  /----\\  /----\\',
  ' /######\\/######\\',
  ' \\######/\\######/',
] as const;

export const TALOS_TERMINAL_EMBLEM_MICRO = ['  []', ' [] []'] as const;

// Compatibility aliases keep the upstream module surface stable while the
// visible welcome screen moves to Talos assets.
export const MINIMAX_CODE_WELCOME_PASTE_IMAGE_SHORTCUT = TALOS_WELCOME_PASTE_IMAGE_SHORTCUT;
export const MINIMAX_CODE_WELCOME_DESIGN = TALOS_WELCOME_DESIGN;
export const MINIMAX_CODE_TERMINAL_WORDMARK = TALOS_TERMINAL_EMBLEM;
export const MINIMAX_CODE_TERMINAL_MEDIUM_WORDMARK = TALOS_TERMINAL_EMBLEM;
export const MINIMAX_CODE_TERMINAL_MICRO_WORDMARK = TALOS_TERMINAL_EMBLEM_MICRO;
