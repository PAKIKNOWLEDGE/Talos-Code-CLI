import { Console } from 'node:console';
import type { Readable, Writable } from 'node:stream';

import { attachStudioJsonlReader, writeStudioJsonLine } from './jsonl.js';
import {
  createStudioServer,
  type StudioJsonRpcRequest,
  type StudioServerOptions,
} from './server.js';

export interface ServeStudioStdioOptions extends StudioServerOptions {
  readonly input: Readable;
  readonly output: Writable;
  readonly signal?: AbortSignal;
}

export async function serveStudioStdio(options: ServeStudioStdioOptions): Promise<void> {
  const restoreConsole = redirectConsoleOutputToStderr(options.output);
  const sink = {
    respond: (id: string | number | null, result: unknown) => {
      writeStudioJsonLine(options.output, { jsonrpc: '2.0', id, result });
    },
    respondError: (id: string | number | null, code: number, message: string) => {
      writeStudioJsonLine(options.output, { jsonrpc: '2.0', id, error: { code, message } });
    },
    notify: (method: string, params: unknown) => {
      writeStudioJsonLine(options.output, { method, params });
    },
  };
  const server = createStudioServer(options, sink);
  let detach = attachStudioJsonlReader(options.input, (line) => {
    if (options.signal?.aborted) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }
    if (!parsed || typeof parsed !== 'object') return;
    void server.dispatch(parsed as StudioJsonRpcRequest);
  });
  const onAbort = () => {
    detach();
    detach = () => undefined;
  };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  try {
    await new Promise<void>((resolve) => {
      if (options.signal?.aborted) {
        resolve();
        return;
      }
      options.input.on('end', () => resolve());
      options.input.on('close', () => resolve());
      options.signal?.addEventListener('abort', () => resolve(), { once: true });
    });
  } finally {
    onAbort();
    restoreConsole();
  }
}

function redirectConsoleOutputToStderr(stderr: Writable): () => void {
  const original = globalThis.console;
  globalThis.console = new Console({ stdout: stderr, stderr });
  return () => {
    globalThis.console = original;
  };
}
