import { visibleWidth } from '../../rendering/text.js';
import { tuiChalk as chalk, tuiColors as colors } from '../../theme/runtime.js';
import { centerToWidth } from '../frame.js';
import {
  TALOS_TERMINAL_ARM,
  TALOS_TERMINAL_ARM_COMPACT,
  TALOS_TERMINAL_ARM_MICRO,
  TALOS_WELCOME_DESIGN,
} from './design.js';

export function renderTuiWelcomeHero(width: number): string[] {
  const { fullMinWidth, mediumMinWidth, microMinWidth, fallbackTitle } = TALOS_WELCOME_DESIGN.hero;
  const source =
    width >= fullMinWidth
      ? TALOS_TERMINAL_ARM
      : width >= mediumMinWidth
        ? TALOS_TERMINAL_ARM_COMPACT
        : width >= microMinWidth
          ? TALOS_TERMINAL_ARM_MICRO
          : [fallbackTitle];
  const sourceWidth = Math.max(...source.map((line) => visibleWidth(line)));

  return source.map((line) => {
    const canvasLine = line + ' '.repeat(Math.max(0, sourceWidth - visibleWidth(line)));
    return centerToWidth(chalk.bold.hex(colors.warning)(canvasLine), width);
  });
}
