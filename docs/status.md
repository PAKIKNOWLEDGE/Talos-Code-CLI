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
