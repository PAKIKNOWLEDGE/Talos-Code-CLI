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
(`apocalypse` | `stargate`, default `apocalypse`). The values and the default are declared in
`packages/config/src/config.ts` and re-exported by the Agent layer; `packages/protocol/src/local.ts` keeps a
`SessionPromptDoctrineView` literal union as the wire mirror of that set, so a new doctrine has to be added in
both places. Both doctrines are fixed reference text rather than authored here, and each asset carries a header
comment listing its resolved conditional branches, deletions, and name substitutions.

Configuration only seeds **new** Sessions, so a later `config.yaml` edit cannot change the discipline of a
conversation already in progress. A Session that stores `promptDoctrine` renders that stored value; one that
stores none — created before the field existed, or by a path that never supplied it — keeps following
`config.yaml`. [Session scope](#session-scope) below lists exactly which creation paths stamp the field.

| Doctrine | Shape | Asset | Copied body |
| --- | --- | --- | --- |
| `apocalypse` | long-form discipline set: seven sections covering task scope, execution care, tool use, tone, and output efficiency | `packages/local-runtime-v2/assets/agents/_v2/tui/doctrine/apocalypse.md.hbs` | 13,798 chars / 53 lines (≈3.8k tokens) |
| `stargate` | minimal discipline set: one identity line and a short guidelines list | `packages/local-runtime-v2/assets/agents/_v2/tui/doctrine/stargate.md.hbs` | 266 chars / 4 lines (≈74 tokens) |

Composition rules:

- `_v2/tui/SYSTEM.md.hbs` is a composer. Its `{{> tui/doctrine}}` marker is replaced with the selected doctrine
  before Handlebars compilation (`BUILTIN_HANDLEBARS` registers no partials, so the marker cannot resolve at
  compile time). The composer keeps only Talos-owned material: identity, the `# Harness` runtime facts (permission
  mode, secrets, and the workspace and convention rules), memory, response-style rules, preamble examples,
  references, and deliverable conventions.
- `# Core Judgment` now holds the doctrine's own framing instead of Talos's previous root-session paragraph. The
  mechanism that used to supply that paragraph is inert for this agent: `_v2` renders no surface prompt for a
  snapshot-backed primary agent (`agent-profile.ts`), so `rootSessionPrompt` is empty, `addRuntimeRules` never
  re-injects `# Core Judgment`, and the composer is the only source. The borrowed intro sentence now provides the
  framing, and the `persona` block still supplies the product identity.
- What the dropped paragraph actually did is kept, as one guarded `# Harness` bullet rather than a role
  narrative: continuity ownership and the rule that a delegated child returns findings instead of addressing the
  user. It is written as responsibility, not hierarchy, and sits behind `{{#if surface.interactive}}` so a
  task-child render never claims to own the conversation.
- `addRuntimeRules` (`preparation/config/runtime-prompt-rules.ts`) injects into the rendered prompt only the
  `<system-reminder>` description, three file-operation rules, and two Windows rules under `# Harness`;
  `LANGUAGE_RULES` under `## Response Style`; `TOOL_CALL_PREAMBLE_REMINDER` under `## Preamble messages`; and
  `rootSessionPrompt` under `# Core Judgment` when that prompt is non-empty. Those exact statements are
  therefore **not** repeated in the composer.
- Talos runtime facts and language instructions win over borrowed text. Where the two would contradict, the
  borrowed bullet is listed in the doctrine's deletion table: the permission rule, the `<system-reminder>` rule,
  and the emoji rule are all dropped in favour of the Talos equivalent. Where they
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

### Session scope

The doctrine is fixed once the Session's first user message is sent, and it stays visible the whole time, in the
status bar.

- `sessions` stores `promptDoctrine` next to `interactionMode`. A child Session inherits its parent's value, a fork
  copies its source's value — a fork carries the whole conversation, so it has to carry the doctrine that shaped it
  too — and `resume` keeps whatever the record holds. `createSession` accepts the field as well, and the TUI create
  path forwards the configured value, so a TUI Session is stamped when it is created instead of being written
  immediately afterwards. A BTW side Session always inherits its parent's value for the same reason, so an explicit
  value on that one route is ignored.
- `createV2AgentProfileSource` resolves `session.promptDoctrine ?? config.promptDoctrine`. The fallback is applied
  twice on the way to the status bar: the Runtime's session view omits the field when the record has none,
  reporting only the stored value, and the TUI layer fills the configured value in while normalising that view.
  Without the second step the line would report an empty slot instead of the doctrine actually in force.
- The Runtime owns the lock. `SessionLifecycleApplication.updateSession` rejects a changed value with `409
  local_prompt_doctrine_locked` once the Session has a user message; re-sending the stored value stays allowed, so
  a title-only update and an idempotent re-save both pass. The value is validated first, so an unknown doctrine is
  `400 VALIDATION_ERROR` and never reported as a locked Session. The guard is injected (`promptDoctrineGuard`)
  because the Session and message repositories already live in `initialize.ts`; a wiring that omits it does not
  enforce the lock, and one test pins that seam so it cannot appear by accident.
- The TUI only reacts: `/doctrine [status | apocalypse | stargate]` reports the current value or asks the Runtime
  to change it, and surfaces the rejection verbatim instead of retrying. Asking for the value already in force
  prints the status block instead of issuing a write, a successful change announces that it applies from the
  Session's next turn (the prompt already composed for the current turn is not rebuilt), and the command is hidden
  until a Session exists. There is no second copy of the lock rule in the client, so the two cannot drift.
- `prompt-doctrine` is a status-line item rendered as `Apocalypse` / `Stargate`, or `APOC` / `STAR` when the line
  has to shrink. It joins both default item orders. The Collapsal footer keeps `approval-mode` last, so the item
  sits immediately before `plan-mode`.

Known boundaries of that guarantee:

- Only a Session that stores a value is scoped to it. `createSession` and the TUI stamp one, but a Session created
  by a path that supplies neither a value nor a parent — cron, root repair, and any caller of the create route that
  omits the field — stores nothing and keeps rendering `config.yaml`. Extending the stamp to those paths would give
  the session lifecycle a configuration dependency it does not have today.
- The gate is the live user-message table, so a rewind back to the first user message removes every user message
  and the Session counts as empty again — consistent with "only an empty Session may change". Rewinding to a later
  message keeps the lock.
- The check and the write are a read pair followed by a separate write, so a user message committed in between
  makes that single update pass. Closing it needs a conditional mutation inside one transaction, which the session
  repository does not offer.
- A Session that stores nothing renders the configured doctrine, so a client asking to store exactly that value is
  still refused once the conversation has begun: the Runtime cannot tell "pin what it already renders" from
  "change it" without reading configuration. The TUI compares against the value it displays, so it reports status
  rather than issuing that write.

Permission modes are untouched by this axis: `promptDoctrine` is orthogonal to `promptMode` and to the permission
classifier.


## Runtime layout (v1 / v2)

`packages/local-runtime-v2` (`@mavis/local-runtime-v2`, 0.1.0, 929 files) is the only runtime the TUI
loads. It declares `@mavis/local-runtime` (v1, 0.2.1, 641 files) as a workspace dependency and
reaches into it from 13 source files and 4 test/helper files, gathered mostly in
`local-runtime-v2/src/compat/v1/`. Nothing outside v2 imports v1, so this is one runtime stacked on
another rather than two live runtimes competing for the same job.

Both packages arrived in the same reviewed upstream import (`2aed5ca`, 2026-09-28, upstream 0.5.7).
The duplication is inherited, not a Talos architecture decision. v1 is a full host with 49
top-level modules — including cloud-facing ones (`channels`, `api`, `matrix`, `team`) that the TUI
product path never reaches. What v2 actually borrows is the persistence slice: the SQLite
session-asset, turn-diff, and communication-message stores, asset registration, and the turn-diff
capabilities.

**Decision (2026-11-17): record and observe; do not modify either package.** Upstream is mid-rewrite
— upstream `main` has rested at `3c21163` (0.7.2) since 2026-11-04 with no merged pull request — so
collapsing v1 into v2 is theirs to sequence first. Removing it here would absorb work they may be
about to do and turn the next selective sync into a conflict.

Revisit when upstream changes the layout (a version line that still ships `@mavis/local-runtime`, or
a v2 tree that no longer imports it), **or by 2027-01-17**, whichever comes first. The check belongs
in [upstream-pr-watch](upstream-pr-watch.md) at each pre-release scan, so a release cannot pass
without at least seeing it.

Three accepted exits, and the third is not a failure:

1. Upstream collapses v1 into v2 — inherit the removal during a selective sync.
2. Talos removes it after the deadline.
3. v1 stays permanently as the storage base — write that down and stop planning a removal.

Exit 2 is gated on evidence rather than on the deadline: v2 opening a synthetic v1-era session
database has to work first. A branch does not protect this, because the risk lives in existing user
databases rather than in Git.

## Next entries (engine)

1. **Security/reliability ports** — #568 (stack-trace exposure), the OAuth refresh fence from #566, and #584 (`exec` workspace errors). Each needs its own reviewed change; see [upstream-pr-watch](upstream-pr-watch.md#review-log).
2. **Waiting boundary** — steer/reminder semantics (architecture if needed).
3. **Deferred identity/skill renames** — [prompt identity follow-ups](superpowers/plans/2026-10-07-prompt-identity-followups.md).
4. **Upstream watch** — [upstream-pr-watch](upstream-pr-watch.md) cadence; record the next snapshot before following npm release.
5. **Runtime layout** — re-check [v1 / v2](#runtime-layout-v1--v2) at each pre-release scan; the observation expires on 2027-01-17 or at the first upstream layout change.

## Reading map

| Question | Document |
| --- | --- |
| Names and layers | [glossary](glossary.md) |
| Upstream PR cadence | [upstream-pr-watch](upstream-pr-watch.md) |
| Release | [releasing](releasing.md), [releases/](releases/) |
| Evidence | [verification](verification.md) |
| Agent rules | [AGENTS.md](../AGENTS.md) |
