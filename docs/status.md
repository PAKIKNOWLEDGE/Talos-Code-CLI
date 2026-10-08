# Current status (Talos CLI)

Updated: 2026-10-08. **This file is the only execution entry for engine work** in this repository. The GUI repository maintains a separate desktop status card.

Companion GUI: `C:\DEV\develop\T3rra-C0d3-Talos` — [docs/status.md](https://github.com/PAKIKNOWLEDGE/Talos/blob/main/docs/status.md) (visual / Tauri; not mirrored here).

## Handover card

| Field | Value |
| --- | --- |
| Task id / revision | `docs-split-strict` / r1 |
| Phase | Documentation overhaul complete; engine facts aligned to **0.1.2** |
| Role | Luna (implementation and doc sync) |
| Trigger | Two-repo semantics collapsed; split-strict status cards and Talos user docs required |
| Scope | `docs/status.md`, `docs/glossary.md`, user/contributor docs, README version lines |
| Out of scope | GUI workflow cards, NOTICE/LICENSE attribution text, runtime code |
| Stop condition | Glossary + this card + Talos-branded install/contributor paths; link GUI card without duplicating desktop tasks |
| Evidence | Release [0.1.2](releases/0.1.2.md); identity merge [PR #1](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/pull/1); verification section in [verification.md](verification.md#talos-prompt-identity-rebrand-2026-10-07) |

## Product line

| Item | Fact |
| --- | --- |
| Release line | **0.1.2** — npm `@pakiknowledge/tal0s-code`, command `talos`, data dir `~/.talos` |
| Repository | [PAKIKNOWLEDGE/Talos-Code-CLI](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI) |
| Identity (2026-10-07) | Bundled prompts rebranded to Talos / Perlica; model-visible `talos` tool examples; `<agent-context>` no longer exposes Mavis as user-facing persona. Internal `mavis` routing keys unchanged by design. |
| Open follow-up | Waiting/polling reminder **communication boundary** (machine reminder vs user reply) — see [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md) and [NixOS follow-up](superpowers/plans/2026-10-03-nixos-followup.md) |
| NixOS | Real use confirmed 2026-10-06; two automated check limitations retained in [verification.md](verification.md) — not treated as daily-use blockers |
| Desktop GUI | Separate repository; not shipped from this line |
| Default web search | Not in CLI preview; self-configured MCP search not validated as a product feature |

## Version vocabulary

| Label | Meaning |
| --- | --- |
| **0.1.x** | Talos fork release and npm line |
| **0.4.12** (and similar) | Inherited upstream capability / source-projection baseline in engineering docs — not the npm dist-tag users install |

## Next entries (engine)

1. **Waiting boundary** — clarify steer/reminder semantics without deleting anti-poll or completion notification; architecture review if reminder retention/lifecycle must change.
2. **Deferred identity/skill renames** — routing contracts and bundled skill content listed in [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md).
3. **Upstream candidates** — selective intake per [source-sync](source-sync.md); not an automatic queue.

## Reading map

| Question | Document |
| --- | --- |
| Names and layers | [glossary](glossary.md) |
| Install and build | [installation](installation.md), [README](../README.md) |
| Release | [releasing](releasing.md), [releases/](releases/) |
| Evidence | [verification](verification.md) |
| Architecture | [architecture](architecture.md) |
| Agent rules | [AGENTS.md](../AGENTS.md) |
