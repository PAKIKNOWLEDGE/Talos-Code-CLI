import { checkTalosNpmVersion, formatTalosNpmStatus, type TalosNpmStatus } from "../../../update/npm-version.js";
type AppendUpdateNotice = (content: string, kind?: 'warning' | 'error') => void;

export interface TuiUpdateOptions {
  readonly version: string;
  readonly checkForUpdate?: () => Promise<{ latestVersion: string } | undefined>;
}

export function createTuiUpdateFlow(append: AppendUpdateNotice): TuiUpdateFlow {
  return new TuiUpdateFlow(append);
}

export class TuiUpdateFlow {
  private stopped = false;

  constructor(
    private readonly append: AppendUpdateNotice,
    private readonly check: () => Promise<TalosNpmStatus> = () => checkTalosNpmVersion(),
  ) {}

  async show(): Promise<void> {
    if (this.stopped) return;
    const status = await this.check();
    if (this.stopped) return;
    this.append(formatTalosNpmStatus(status), "warning");
  }

  stop(): void {
    this.stopped = true;
  }
}
