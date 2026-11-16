import { PROMPT_DOCTRINES } from '@mavis/config';
import {
  formatTuiPromptDoctrine,
  formatTuiPromptDoctrineCompact,
  type TuiPromptDoctrine,
} from '../../../application/prompt-doctrine.js';
import { getKeybindings, matchesKey } from '../../engine/public.js';
import type { Component } from '../../rendering/component.js';
import { truncateToWidth, visibleWidth } from '../../rendering/text.js';
import { tuiChalk as chalk, tuiColors as colors } from '../../theme/runtime.js';
import { questionnaireFrameContentWidth, renderQuestionnaireFrame } from './decision-frame.js';

const DOCTRINE_DESCRIPTIONS: Record<TuiPromptDoctrine, string> = {
  apocalypse: 'Long-form discipline sections',
  stargate: 'Minimal doctrine',
};

/**
 * `/doctrine` with no argument. The choice is made before the Session exists,
 * so nothing has been cached yet and switching costs nothing.
 */
export class TuiPromptDoctrinePicker implements Component {
  private selectedIndex: number;

  constructor(
    private readonly currentDoctrine: TuiPromptDoctrine | undefined,
    private readonly onSelect: (doctrine: TuiPromptDoctrine) => void,
    private readonly onCancel: () => void,
    private readonly requestRender: () => void = () => undefined,
  ) {
    const currentIndex = currentDoctrine ? PROMPT_DOCTRINES.indexOf(currentDoctrine) : -1;
    this.selectedIndex = currentIndex >= 0 ? currentIndex : 0;
  }

  handleInput(data: string): void {
    if (matchesKey(data, 'up')) {
      this.selectedIndex =
        this.selectedIndex === 0 ? PROMPT_DOCTRINES.length - 1 : this.selectedIndex - 1;
      this.requestRender();
      return;
    }
    if (matchesKey(data, 'down')) {
      this.selectedIndex = (this.selectedIndex + 1) % PROMPT_DOCTRINES.length;
      this.requestRender();
      return;
    }
    if (/^[1-2]$/u.test(data)) {
      const doctrine = PROMPT_DOCTRINES[Number(data) - 1];
      if (doctrine) this.onSelect(doctrine);
      return;
    }
    if (matchesKey(data, 'enter')) {
      const doctrine = PROMPT_DOCTRINES[this.selectedIndex];
      if (doctrine) this.onSelect(doctrine);
      return;
    }
    if (getKeybindings().matches(data, 'tui.select.cancel')) this.onCancel();
  }

  invalidate(): void {}

  render(width: number): string[] {
    const safeWidth = Math.max(0, Math.floor(width));
    if (safeWidth === 0) return [];
    const contentWidth = questionnaireFrameContentWidth(safeWidth);
    const compact = contentWidth < 56;
    const current = this.currentDoctrine
      ? formatTuiPromptDoctrine(this.currentDoctrine)
      : 'not chosen';
    return renderQuestionnaireFrame(
      {
        title: safeWidth < 42 ? `Doctrine · ${current}` : 'Behaviour doctrine',
        ...(safeWidth >= 42 ? { meta: `Current · ${current}` } : {}),
        body: [
          chalk.hex(colors.muted)(
            compact
              ? 'Choose one doctrine for the next Session.'
              : 'A Session keeps one doctrine for its whole life so the prompt cache stays warm.',
          ),
          '',
          ...PROMPT_DOCTRINES.flatMap((doctrine, index) =>
            renderDoctrine(doctrine, {
              active: doctrine === this.currentDoctrine,
              focused: index === this.selectedIndex,
              compact,
              width: contentWidth,
            }),
          ),
        ],
        footer:
          safeWidth < 42 ? '↑/↓ move · Enter · Esc back' : '↑/↓ select · Enter apply · Esc cancel',
      },
      safeWidth,
      'signal',
    );
  }
}

function renderDoctrine(
  doctrine: TuiPromptDoctrine,
  options: {
    readonly active: boolean;
    readonly focused: boolean;
    readonly compact: boolean;
    readonly width: number;
  },
): string[] {
  const prefix = options.focused ? chalk.bold.hex(colors.signal)('›') : ' ';
  const label = (options.focused ? chalk.bold : chalk).hex(
    options.focused ? colors.signal : colors.text,
  )(formatTuiPromptDoctrineCompact(doctrine).padEnd(5));
  const status = options.active ? chalk.hex(colors.signal)('● active') : '';
  const description = chalk.hex(colors.muted)(DOCTRINE_DESCRIPTIONS[doctrine]);
  const heading = `${prefix} ${label}`;

  if (options.compact) {
    return [
      fitWithRightMeta(heading, status, options.width),
      truncateToWidth(`  ${description}`, options.width, ''),
    ];
  }
  return [fitWithRightMeta(`${heading}  ${description}`, status, options.width)];
}

function fitWithRightMeta(content: string, meta: string, width: number): string {
  if (!meta) return truncateToWidth(content, width, '');
  const gap = width - visibleWidth(content) - visibleWidth(meta);
  if (gap >= 2) return `${content}${' '.repeat(gap)}${meta}`;
  const contentWidth = Math.max(0, width - visibleWidth(meta) - 2);
  return `${truncateToWidth(content, contentWidth, '')}  ${meta}`;
}
