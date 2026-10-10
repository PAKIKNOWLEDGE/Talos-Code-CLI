import { Console } from 'node:console';
import type { Readable, Writable } from 'node:stream';

import { serveStudioStdio } from '../studio/stdio.js';
import { prepareTuiDataDir } from '../runtime/data-dir.js';
import type {
  CreatedTuiRuntime,
  createTuiRuntime,
  shutdownTuiRuntime,
} from '../runtime/lifecycle.js';

type TuiTerminationSignal = 'SIGINT' | 'SIGTERM' | 'SIGHUP';

interface TuiStudioProcess {
  readonly stdin: Readable;
  readonly stdout: Writable;
  readonly stderr: Writable;
  once(signal: TuiTerminationSignal, listener: () => void): unknown;
  off(signal: TuiTerminationSignal, listener: () => void): unknown;
}

export interface RunTuiStudioCommandDependencies {
  readonly processRef?: TuiStudioProcess;
  readonly workspaceDir?: () => string;
  readonly prepareDataDir?: typeof prepareTuiDataDir;
  readonly createRuntime?: typeof createTuiRuntime;
  readonly shutdownRuntime?: typeof shutdownTuiRuntime;
  readonly serve?: typeof serveStudioStdio;
  readonly loadRuntimeLifecycle?: () => Promise<{
    createTuiRuntime: typeof createTuiRuntime;
    shutdownTuiRuntime: typeof shutdownTuiRuntime;
  }>;
}

export async function runTuiStudioCommand(
  version: string,
  dependencies: RunTuiStudioCommandDependencies = {},
  lane?: string,
): Promise<void> {
  const processRef = dependencies.processRef ?? process;
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('Studio server is stopping.'));
  const restoreConsole = redirectConsoleOutputToStderr(processRef.stderr);
  let runtime: CreatedTuiRuntime | undefined;
  let shutdownRuntime = dependencies.shutdownRuntime;
  processRef.once('SIGINT', cancel);
  processRef.once('SIGTERM', cancel);
  processRef.once('SIGHUP', cancel);
  try {
    const lifecycle =
      dependencies.createRuntime && dependencies.shutdownRuntime
        ? {
            createTuiRuntime: dependencies.createRuntime,
            shutdownTuiRuntime: dependencies.shutdownRuntime,
          }
        : await (dependencies.loadRuntimeLifecycle ?? (() => import('../runtime/lifecycle.js')))();
    const createRuntime = dependencies.createRuntime ?? lifecycle.createTuiRuntime;
    shutdownRuntime ??= lifecycle.shutdownTuiRuntime;
    const dataDir = await (dependencies.prepareDataDir ?? prepareTuiDataDir)();
    runtime = await createRuntime({
      dataDir,
      workspaceDir: (dependencies.workspaceDir ?? (() => process.cwd()))(),
      version,
      surface: 'studio',
      ...(lane ? { lane } : {}),
    });
    await (dependencies.serve ?? serveStudioStdio)({
      runtime: runtime.adapter,
      version,
      workspaceDir: (dependencies.workspaceDir ?? (() => process.cwd()))(),
      input: processRef.stdin,
      output: processRef.stdout,
      signal: controller.signal,
    });
  } finally {
    processRef.off('SIGINT', cancel);
    processRef.off('SIGTERM', cancel);
    processRef.off('SIGHUP', cancel);
    try {
      if (runtime && shutdownRuntime) await shutdownRuntime(runtime);
    } finally {
      restoreConsole();
    }
  }
}

function redirectConsoleOutputToStderr(stderr: Writable): () => void {
  const original = globalThis.console;
  globalThis.console = new Console({ stdout: stderr, stderr });
  return () => {
    globalThis.console = original;
  };
}
