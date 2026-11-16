# Current status (Talos CLI)

Updated: 2026-11-14. **This file is the only execution entry for engine work** in this repository. The GUI repository maintains a separate desktop status card.

Companion GUI: `C:\DEV\develop\T3rra-C0d3-Talos` — [docs/status.md](https://github.com/PAKIKNOWLEDGE/Talos/blob/main/docs/status.md) (visual / Tauri; not mirrored here).

## Handover card

| Field | Value |
| --- | --- |
| Task id / revision | `upstream-watch-2026-11-14` / r1 |
| Phase | **Recording** — release line `0.1.14`; upstream `0.7.2` reviewed as reference; no P0 |
| Role | Builder (CLI) |
| Trigger | The two-week upstream cadence was due and the handover card still described 0.1.3 (2026-11-14) |
| Scope delivered | Docs brought up to date; upstream snapshot recorded; follow-up candidates identified |
| Out of scope | Source ports; desktop GUI; upstream merge (see [upstream-pr-watch](upstream-pr-watch.md) 2026-11-14: no P0) |
| Stop condition | Met — documentation matches `package.json` and the recorded watch; ports need a separately authorized change |
| Evidence | [upstream-pr-watch](upstream-pr-watch.md) 2026-11-14; [0.1.14 release notes](releases/0.1.14.md); `pnpm check:source`, `pnpm check:tsconfig`, `pnpm test:release-tools` |

## Product line

| Item | Fact |
| --- | --- |
| Release line | **0.1.14** current on npm (`latest`); **0.1.13** previous |
| Repository | [PAKIKNOWLEDGE/Talos-Code-CLI](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI) |
| Upstream reference (2026-11-14) | `MiniMax-AI/minimax-code` main is **0.7.2** (`3c21163`), plus Python SDK 0.1.1. Merged since the 2026-11-01 scan: #566 (0.7.2 sync; image-budget behavior already ported in 0.1.13/0.1.14), #568, #579, #584, #571/#586. No P0. |
| Review candidates | #568 stack-trace exposure in local-runtime HTTP JSON; the OAuth refresh fence inside #566; #584 `exec` workspace errors. #579 needs a coordinated tool-catalog rename and Python SDK is out of scope. |
| ACP (2026-10-09) | `session/delete` for persistent session removal; `close` unchanged (detach only) |
| Identity (2026-10-07) | Talos / Perlica prompt rebrand on 0.1.2 line |
| Open follow-up | Waiting/polling reminder boundary — [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md) |
| Desktop GUI | Separate repo; no engine change is pending from this repository |

## Version vocabulary

| Label | Meaning |
| --- | --- |
| **0.1.x** | Talos fork release and npm line |
| **0.5.5** | Public upstream baseline imported by the reviewed source update |
| **0.7.2** | Current public upstream reference; not imported as a unit |
| **0.4.12** (and similar) | Inherited upstream capability baseline in engineering docs |

## Prompt doctrine

The TUI system prompt composes exactly one behaviour doctrine, selected by `promptDoctrine` in `config.yaml`
(`apocalypse` | `stargate`, default `apocalypse`; the values and the default are declared once in
`packages/config/src/config.ts` and re-exported by the Agent layer). Both are copied from a validated upstream
harness rather than authored here, and each asset carries a header comment listing its source, resolved
conditional branches, deletions, and name substitutions.

Verifiability differs by doctrine, and the difference is deliberate: `stargate` can be diffed against
`third_party/pi-mono` in this checkout, while `apocalypse` is a reconstruction from the source map shipped in
the published Claude Code package, so its baseline is external and the header is the only local record.

| Doctrine | Source | Asset | Copied body |
| --- | --- | --- | --- |
| `apocalypse` | Claude Code `constants/prompts.ts` static sections composed by `getSystemPrompt` (175-442), ant branch | `packages/local-runtime-v2/assets/agents/_v2/tui/doctrine/apocalypse.md.hbs` | 13,798 chars / 53 lines (≈3.8k tokens) |
| `stargate` | `pi-mono` `core/system-prompt.ts` identity line (130) + guidelines list (137-138) | `packages/local-runtime-v2/assets/agents/_v2/tui/doctrine/stargate.md.hbs` | 266 chars / 4 lines (≈74 tokens) |

Composition rules:

- `_v2/tui/SYSTEM.md.hbs` is a composer. Its `{{> tui/doctrine}}` marker is replaced with the selected doctrine
  before Handlebars compilation (`BUILTIN_HANDLEBARS` registers no partials, so the marker cannot resolve at
  compile time). The composer keeps only Talos-owned material: identity, the `# Harness` runtime facts (permission
  mode, secrets, and the workspace and convention rules), memory, response-style rules, preamble examples,
  references, and deliverable conventions.
- `# Core Judgment` now holds the doctrine's own framing instead of Talos's previous root-session paragraph. That
  paragraph is intentionally dropped: `_v2` ships no surface template, so `rootSessionPrompt` is empty and
  `addRuntimeRules` never re-injects `# Core Judgment` — the composer is the only source, and the borrowed intro
  sentence now serves as the framing. The `persona` block still supplies the product identity.
- `addRuntimeRules` (`preparation/config/runtime-prompt-rules.ts`) injects into the rendered prompt only the
  `<system-reminder>` description, three file-operation rules, and two Windows rules under `# Harness`;
  `LANGUAGE_RULES` under `## Response Style`; `TOOL_CALL_PREAMBLE_REMINDER` under `## Preamble messages`; and
  `rootSessionPrompt` under `# Core Judgment` when that prompt is non-empty. Those exact statements are
  therefore **not** repeated in the composer.
- Talos runtime facts and language instructions win over borrowed text. Where the two would contradict, the
  borrowed bullet is listed in the doctrine's deletion table: the Claude Code permission rule, its
  `<system-reminder>` rule, and its emoji rule are all dropped in favour of the Talos equivalent. Where they
  merely agree — dedicated tools, parallel calls, `file_path:line_number`, faithful reporting — both are kept
  rather than trimming the copy, so the assembled prompt repeats those three or four statements without ever
  contradicting itself. The doctrine files record that scope explicitly.
- A doctrine composes for any render that resolves to the `tui` prompt template, including a desktop-profile
  render that names `promptMode: 'tui'`. The `coding` and `work` templates contain no marker, and no desktop
  template exists, so the field is inert everywhere else.
- An unknown doctrine value is rejected by `inlineDoctrine` with an `Invalid prompt doctrine` error rather than
  being reported as a missing file.
- Both assets are listed in `prompt-exemptions.json`, which is review documentation rather than an enforced
  gate, and they are deliberately kept out of `managed-prompts.json` (that file is the desktop remote-delivery
  contract).

Session scoping (doctrine fixed at session start, visible in the status bar) is tracked as a follow-up change;
`config.yaml` currently supplies the value for every render.

## Next entries (engine)

1. **Security/reliability ports** — #568 (stack-trace exposure), the OAuth refresh fence from #566, and #584 (`exec` workspace errors). Each needs its own reviewed change; see [upstream-pr-watch](upstream-pr-watch.md#review-log).
2. **Waiting boundary** — steer/reminder semantics (architecture if needed).
3. **Deferred identity/skill renames** — [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md).
4. **Upstream watch** — [upstream-pr-watch](upstream-pr-watch.md) cadence; record the next snapshot before following npm release.

## Reading map

| Question | Document |
| --- | --- |
| Names and layers | [glossary](glossary.md) |
| Upstream PR cadence | [upstream-pr-watch](upstream-pr-watch.md) |
| Release | [releasing](releasing.md), [releases/](releases/) |
| Evidence | [verification](verification.md) |
| Agent rules | [AGENTS.md](../AGENTS.md) |
