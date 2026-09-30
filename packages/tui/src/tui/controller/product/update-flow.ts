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

  constructor(private readonly append: AppendUpdateNotice) {}

  async show(): Promise<void> {
    if (this.stopped) return;
    this.append(
      'This build has no Talos npm update source configured. Use the current source build; Talos does not install updates automatically.',
      'warning',
    );
  }

  stop(): void {
    this.stopped = true;
  }
}
