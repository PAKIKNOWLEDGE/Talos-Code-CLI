#!/usr/bin/env node
import { configureMcodeToolsChildEnvironment } from './mcode-tools-environment.js';

if (process.env.TALOS_NEUTRAL_RUNTIME === '1') {
  process.stderr.write('Upstream cloud tools are unavailable in Talos. Configure your own MCP server.\n');
  process.exitCode = 1;
} else {
  configureMcodeToolsChildEnvironment();
  const embeddedEntry = new URL('./embedded/mcode-tools/cli.mjs', import.meta.url);
  await import(embeddedEntry.href);
}
