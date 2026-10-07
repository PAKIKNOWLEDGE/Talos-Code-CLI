# Prompt identity follow-ups

The 2026-10-07 Talos identity pass rebranded the bundled agent prompts (agent name
`Mavis` → `Perlica`, product references `MiniMax Code` → `Talos`) in ten
`packages/local-runtime-v2/assets/agents/` files: the four `_v2` system/surface
templates and the six persona assets. This document records what that pass
deliberately deferred. None of the items below are scheduled; each needs its own
task with functional verification before any rename is made.

## 1. Model-visible functional names (verify the runtime name first)

These names appear in prompt text but are bound to real runtime features.
Renaming them is a functional change, not an identity edit.

- `mavis-trash`, the recoverable-deletion helper under the data directory's
  `bin/`, referenced in `mavis/features/recoverable-deletion.md.hbs` and
  `_default/prompt-base-all.md(.hbs)`.
- "load the `mavis` skill" guidance in the `_v2` templates,
  `AGENT_CONTEXT.md.hbs`, `_default/prompt-base-all.md(.hbs)`, and
  `mavis/features/memory.md.hbs`, gated by the `skills.mavis` / `features.mavis`
  capability flags. No `SKILL.md` named `mavis` exists in this repository; the
  reference resolves through runtime capability gating.
- `#mavis-source=` citation anchors in the `mavis/modes/*/online/SYSTEM.md.hbs`
  reference examples.
- `mavis({ command: "session list", ... })` tool-call examples in
  `_default/prompt-session-root.md.hbs`.

## 2. Internal identifiers (explicit non-goals)

Not model-visible and load-bearing across layers; renaming any of these is a
cross-layer contract change (storage, config, adapters, generated tsconfig), not
a prompt edit.

- `builtin-agents.json` roster names (`mavis`, `explore`, `worker`, `verifier`).
- `managed-prompts.json` and `prompt-exemptions.json` path keys under `mavis/`.
- `@mavis/*` workspace package names and the `x-mavis` frontmatter extension key
  parsed by agent configuration.
- The `mavis/` asset directory name itself and the `mavis` flags in
  `explore/agent.md` / `verifier/agent.md`.

## 3. Bundled skill content (rewrite or audit per skill)

Each item below teaches runtime facts (commands, binaries, product concepts);
edits require confirming the actual runtime names first.

- `mavis/skills/minimax-code-product/**`: a product-knowledge skill describing
  MiniMax Code (the `mcode` command, account models, workflows). It teaches the
  wrong product for Talos and needs a dedicated rewrite, not a find-and-replace.
- `mavis/skills/mavis-doctor/**`: the built-in skill name and its references.
- `packages/local-runtime/assets/skills/`:
  - `deep-research`: "Mavis runtime" phrasing and the `mavis-deep-research`
    scratch-directory name.
  - `init`: "Mavis-managed" / "Mavis-branded" wording.
  - `lark-tools`: `mavis im channel bind` command references (about twelve
    places across the skill and references).
  - `llm-call`: "normal Mavis agent execution" and the
    `minimax-test/MiniMax-M3` provider example.
  - `docx/scripts/env_check.sh`: "Mavis daemon" messages.

## 4. Adjacent user-facing surfaces (separate product decisions)

Observed during the same sweep; recorded here so they are not lost, but they are
outside the prompt assets and need a product call:

- TUI strings such as "Signed in with MiniMax Global. Restart MCode to use this
  account region." MiniMax account login remains a supported feature, so the
  wording is a positioning decision, not a defect fix.
- The terminal title's app-name component ("MCode").
- The persona `avatar` frontmatter URL, which still points at a MiniMax CDN
  asset. Replacing it is a design task for the companion GUI repository.

## Boundary

This document records scope only. It does not authorize implementation, rename
any runtime surface, or change test expectations beyond the identity pass that
created it.
