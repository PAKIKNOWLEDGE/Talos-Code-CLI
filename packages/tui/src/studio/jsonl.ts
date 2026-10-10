import type { Readable, Writable } from 'node:stream';

/** Strict LF JSONL framing (same rule as pi RPC). */
export function serializeStudioJsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

export function writeStudioJsonLine(output: Writable, value: unknown): void {
  output.write(serializeStudioJsonLine(value));
}

export function attachStudioJsonlReader(
  input: Readable,
  onLine: (line: string) => void,
): () => void {
  let buffer = '';
  const onData = (chunk: string | Buffer) => {
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    for (;;) {
      const index = buffer.indexOf('\n');
      if (index < 0) break;
      let line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.length > 0) onLine(line);
    }
  };
  input.setEncoding('utf8');
  input.on('data', onData);
  return () => input.off('data', onData);
}
