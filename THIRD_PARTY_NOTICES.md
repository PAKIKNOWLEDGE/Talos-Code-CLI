# Third-party notices

- **Pi**: `third_party/pi-mono` and derived terminal code, MIT. Full notices are in `third_party/pi-mono/LICENSE` and `packages/tui/THIRD_PARTY_NOTICES.md`. Local modifications are recorded in `third_party/pi-mono/MINIMAX_CHANGES.md`.
- **Claude Code system-prompt text**: `packages/local-runtime-v2/assets/agents/_v2/tui/doctrine/apocalypse.md.hbs` reproduces the static discipline sections of Anthropic's Claude Code system prompt, reconstructed from the source map shipped inside that company's published package. Copyright Anthropic; it is not offered under the root MIT license, and no redistribution grant accompanies it. The file's header comment records every deletion and name substitution applied to the copied text.
- **Sandbox Runtime**: `third_party/sandbox-runtime`, Apache-2.0. See its README, LICENSE, and upstream.json for the upstream version, source revision, fork changes, and native build instructions.
- **models.dev**: the bundled provider / model catalog snapshot, MIT; notices are in `packages/tui/THIRD_PARTY_NOTICES.md`.
- **Bundled assets**: LICENSE, NOTICE, and file-level declarations in each asset directory retain their original attribution.
- **npm dependencies**: versions and declared licenses are recorded in `release/dependency-licenses.json`; `pnpm-lock.yaml` is authoritative for dependency resolution and integrity.
- **mcode-tools 0.0.4**: extracted unchanged from the public `@minimax-ai/code@0.3.11` package during the build. Its distribution manifest declares MIT; archive and CLI hashes are pinned in `scripts/lib/mcode-tools-artifact.mjs`. The tool's own manifest is retained, and the original distribution's third-party notices are copied to `dist/MCODE_TOOLS_NOTICES.md`. The root license does not replace this artifact's existing declarations.

The root MIT license does not replace these materials' separate licenses or copyright notices.
