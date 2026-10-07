# Harness prompt research, 2026-10-07

Research notes recorded before the Talos prompt identity pass (pull request #1).
This document records findings and direction only; it authorizes no
implementation beyond that pass. Upstream observations at the end are
observation-only: no intake work is scheduled or authorized by this document.

## 1. The fork builds on pi — verified

Multiple independent sources confirm that MiniMax Code (the upstream of this
fork) is built on the pi agent toolkit:

- This repository vendors `third_party/pi-mono` with an import baseline recorded
  in `third_party/pi-mono/MINIMAX_CHANGES.md` (upstream
  `earendil-works/pi-mono.git`, tag v0.79.1, commit `28df940f`, imported
  2026-06-16) plus a local patch ledger.
- The four pi packages (`agent`, `ai`, `coding-agent`, `tui`) are build inputs
  via `release/extraction.json` `packageRoots`.
- The public upstream repository `MiniMax-AI/minimax-code` contains
  `third_party/pi-mono` and its `LICENSE-STATUS.md` acknowledges "Pi, derived
  terminal code, the model catalog and bundled assets retain their original
  declarations".
- This distribution's turn runner is literally named `pi-turn-runner`
  (`packages/agent-core/src/pi-turn-runner/`).

Precision: pi supplies the agent loop, model-protocol layer, and terminal
infrastructure; the distribution adds roughly twenty-seven first-party packages
(runtime, OAuth, tools, config) on top. pi itself is Mario Zechner's
(earendil-works) deliberately minimal agent toolkit.

## 2. Harness prompt scale — measured

Raw template sizes (pre-expansion; `.hbs` conditionals make rendered sizes vary;
tool descriptions, skills, and AGENTS.md injections excluded):

| Harness | System prompt | Notes |
| --- | --- | --- |
| pi (coding agent) | 1,297 chars ≈ 325 tokens (`third_party/pi-mono/packages/coding-agent/src/core/system-prompt.ts:130-147`) | Author states prompt + tool definitions total under 1,000 tokens |
| This distribution (TUI default, `_v2/tui/SYSTEM.md.hbs`) | 9,778 chars ≈ 2,444 tokens | Plus `_v2/AGENT_CONTEXT.md.hbs` (12,323 chars raw) as a surface layer |
| Codex (per-model manifest) | 17,297–21,769 chars ≈ 4,300–5,450 tokens per model (`codex-rs/models-manager/models.json`, `model_messages.instructions_template`) | Newer GPT-6 models get usage-instruction sections stripped via `include_*` flags; the open-source baseline prompt is `codex-rs/models-manager/prompt.md` (≈5.2k tokens) |

The V2 prompt path is the live TUI path (`packages/local-runtime-v2/src/service/agent/builtin/catalog.ts:609`).

## 3. Does the harness prompt affect execution — sources

Consistent findings across peer-reviewed work, vendor engineering guidance, and
primary practitioner accounts: prompt content, structure, format, and size all
affect agent execution; larger is not better; the target is the smallest set of
high-signal tokens ("minimal does not necessarily mean short").

1. Mario Zechner, *What I learned building an opinionated and minimal coding agent* (2025-11-30) — <https://mariozechner.at/posts/2025-11-30-pi-coding-agent/>
2. Anthropic Engineering, *Building effective agents* (2024-12-19) — <https://www.anthropic.com/engineering/building-effective-agents>
3. Anthropic Engineering, *Effective context engineering for AI agents* (2025-09-29) — <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>
4. Sclar et al., *FormatSpread*, ICLR 2024 — <https://arxiv.org/abs/2310.11324>
5. Yang et al., *SWE-agent*, NeurIPS 2024 — <https://arxiv.org/abs/2405.15793>
6. Hong, Troynikov, Huber (Chroma), *Context Rot* (2025-07-14) — <https://www.trychroma.com/research/context-rot>
7. Kim et al. (KAIST), *The Cost of Dynamic Reasoning* (HPCA 2026) — <https://arxiv.org/abs/2506.04301>
8. pi v1.0.0 release notes (codemode prompt tokens cut ~40%) — <https://github.com/earendil-works/pi/releases/tag/v1.0.0>

## 4. Recorded direction for this distribution

- Do not copy Codex prompts (tool surface and model-family assumptions differ;
  per-model gating shows even Codex does not ship one universal prompt).
- Do not adopt pi-scale minimalism wholesale (this distribution's feature set is
  far larger than pi's by design).
- Trim by failure mode: keep role/boundary sections, compress high-signal rules,
  move procedural detail into tool descriptions, delete sections with no
  observable failure behind them, and verify each batch with the capability
  suites and real-session comparison.
- A 2026-10-07 verbatim-borrowed example block (eight canned preamble replies
  copied from Codex's prompt.md, present in three prompt assets) was identified
  as a parroting risk; its removal is recorded in
  [prompt identity follow-ups](2026-10-07-prompt-identity-followups.md) and is
  not part of pull request #1.
- Make system-prompt token count observable before further trimming.

## 5. Upstream observations (observation-only)

Recorded from GitHub on 2026-10-07; no intake authorized:

- `MiniMax-AI/minimax-code` main, merged after the 2026-10-02 selective intake
  (#199, #388, #410-literal): #416 (regular-mode history stability), #421/#422/#423
  (0.6.0–0.6.2 sync bundles), #428 (first-event/idle timeouts for hung model
  requests), #429 (defer rebuild after layout shrink), #431 (image-limit
  recovery), #436 (opt-in lightweight context mode), #363 (dev dependency
  bumps). Generic-fix candidates (#428, #431, #416+#429) look strongest;
  version-sync bundles need decomposition; #436 is a product decision.
- pi upstream moved v0.79.1 → v1.0.4 (v1.0.0 on 2026-10-01) with breaking
  changes (fullscreen TUI default, tool probing API, MCP OAuth storage); the
  vendored upgrade is a dedicated reviewed sync, not a bump.

## Boundary

Token counts are characters/4 estimates, not tokenizer measurements. Rendered
prompt sizes were not captured at runtime. No upstream merge, fetch, or push was
performed; the identity pass itself is evidence-recorded in
[verification records](../../verification.md#talos-prompt-identity-rebrand-2026-10-07).
