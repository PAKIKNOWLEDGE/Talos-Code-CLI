# Current status (Talos CLI)

Updated: 2026-10-09. **This file is the only execution entry for engine work** in this repository. The GUI repository maintains a separate desktop status card.

Companion GUI: `C:\DEV\develop\T3rra-C0d3-Talos` — [docs/status.md](https://github.com/PAKIKNOWLEDGE/Talos/blob/main/docs/status.md) (visual / Tauri; not mirrored here).

## Handover card

| Field | Value |
| --- | --- |
| Task id / revision | `acp-session-delete` / r1 |
| Phase | **Implemented on branch** — publish **0.1.3** after Windows verify + merge to `main` |
| Role | Builder (CLI) |
| Trigger | Desktop studio nav lists sessions but could not remove test junk (2026-10-09) |
| Scope delivered | ACP `session/delete`, `sessionCapabilities.delete`, persist via `deleteSession`; tests in `acp-agent.test.ts` |
| Out of scope | Desktop delete UI; upstream merge (see [upstream-pr-watch](upstream-pr-watch.md) 2026-10-09: no P0) |
| Stop condition | npm `@pakiknowledge/tal0s-code@0.1.3` + GitHub Release published; then GUI may wire delete |
| Evidence | Vitest `acp-agent.test.ts` 109/109; [0.1.3 release notes](releases/0.1.3.md) |

## Product line

| Item | Fact |
| --- | --- |
| Release line | **0.1.3** pending publish (code ready); **0.1.2** current on npm until then |
| Repository | [PAKIKNOWLEDGE/Talos-Code-CLI](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI) |
| ACP (2026-10-09) | `session/delete` for persistent session removal; `close` unchanged (detach only) |
| Identity (2026-10-07) | Talos / Perlica prompt rebrand on 0.1.2 line |
| Open follow-up | Waiting/polling reminder boundary — [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md) |
| Desktop GUI | Separate repo; delete button waits for published **0.1.3** |

## Version vocabulary

| Label | Meaning |
| --- | --- |
| **0.1.x** | Talos fork release and npm line |
| **0.4.12** (and similar) | Inherited upstream capability baseline in engineering docs |

## Next entries (engine)

1. **Publish 0.1.3** — merge `feat/acp-session-delete`, run [releasing](releasing.md), npm + GitHub Release.
2. **Waiting boundary** — steer/reminder semantics (architecture if needed).
3. **Deferred identity/skill renames** — [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md).
4. **Upstream selective sync** — [upstream-pr-watch](upstream-pr-watch.md) cadence; next scan before following npm release.

## Reading map

| Question | Document |
| --- | --- |
| Names and layers | [glossary](glossary.md) |
| Upstream PR cadence | [upstream-pr-watch](upstream-pr-watch.md) |
| Release | [releasing](releasing.md), [releases/](releases/) |
| Evidence | [verification](verification.md) |
| Agent rules | [AGENTS.md](../AGENTS.md) |
