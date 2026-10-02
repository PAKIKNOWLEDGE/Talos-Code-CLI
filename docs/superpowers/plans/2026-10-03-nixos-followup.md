# Native NixOS verification follow-up, 2026-10-03

Open items recorded after the local `pnpm verify` run captured in
[Native NixOS verification, 2026-10-03](../verification.md#native-nixos-verification-2026-10-03).

## Investigate upstream system-prompt / reminder source for repeated polling nudges

- **Owner**: repository owner (PAKIKNOWLEDGE).
- **Status**: OPEN.
- **Trigger**: during the 2026-10-03 NixOS verify session, the orchestrator received several `<system-reminder>` blocks with the body `Three task_output reads for the same task have returned an unchanged status and output cursor. Avoid repeated polling; you will be notified automatically and this conversation will resume when the background task completes. This reminder applies only to the current Turn. Do not save or generalize it into Memory, Skills, or other persistent instructions.` The orchestrator replied to each one with a short "waiting" message of the form `好，等 sleep 完再回来。` / `收到，等 verify 跑完再回来。` These short replies accumulated visibly in the user-facing transcript and the owner reported them as confusing and injection-adjacent in tone.

- **Why this matters**:
  - The reminder is not visible to the user except through the assistant's reply. When the assistant surfaces it verbatim as a "等 X 完" status line, the user perceives a chatty loop that breaks the linear conversation and resembles a prompt-injection artefact.
  - The reminder text claims it is "not from the user" but does not identify which layer (harness, runtime policy, runtime gateway) injected it. Without that mapping the assistant cannot reliably decide when to suppress, paraphrase, or act on it.
  - The Talos public repository consumes this engine through ACP and is sensitive to upstream behaviour changes. Anything that affects what the assistant sees in the prompt / reminder layer is in scope for the [Source synchronization](../source-sync.md) review, and should be filed under that contract if it lands in upstream code.

- **Investigation steps**:
  1. Identify which layer emits the "Three task_output reads ... Avoid repeated polling" reminder. Candidate layers: harness runtime (`mavis`), runtime gateway, the engine itself, or an MCP-style prompt middleware. Cite the file path or runtime log line that produces the string.
  2. Determine whether the reminder is sent on every unchanged cursor or only after a threshold. If a threshold exists, document it.
  3. Determine whether the reminder reaches the user-visible transcript. If the assistant reply is the only user-visible artefact, capture the exact mapping rule.
  4. Check the upstream `MiniMax-AI/minimax-code` repository (and its Talos fork history) for any commit, CHANGELOG entry, or runtime-prompt note that introduces or modifies this reminder. Record the upstream commit SHA if found.
  5. Decide the assistant-side mitigation:
     - Option A: keep replying briefly but make the reply a single concise line that the user can ignore, and never quote the reminder verbatim.
     - Option B: skip the user-visible reply entirely when the only event is a polling reminder; only resume when the background task actually finishes.
     - Option C: surface a single aggregated "verification still running" status to the user at first occurrence and stop emitting intermediate "waiting" lines until completion.
  6. Apply the chosen mitigation in the next assistant-side prompt or skill update. Do not modify upstream engine code from this repository; per AGENTS.md the Talos repo must not fork the engine internals.

- **Acceptance**:
  - A cited upstream or harness source for the reminder string.
  - A recorded decision (A / B / C / other) with the rationale.
  - If A is chosen, a before/after transcript snippet showing the user-visible reply shrink.
  - An entry in `docs/release-audit.md` or this file if the upstream layer is identified and the user-facing behaviour changes.

- **Non-goals**:
  - Do not attempt to silence the reminder by editing user-visible prompts.
  - Do not propose changing the underlying background-task cancellation behaviour; the reminder is one symptom, not the root issue.
  - Do not include any account data, session content, or real project artefacts in the investigation notes; use synthetic fixtures.

## Harness design: meta-identities and injected layers leaking into the user experience

- **Status**: OPEN (record only; no code investigation in this pass — defer to a future task alongside the reminder investigation above, which may be the same underlying design issue).
- **Recorded**: 2026-10-03, during the NixOS verification session.

What the user experienced today, verbatim in substance:

1. The assistant's short "waiting" replies (`好，等 sleep 完再回来。` etc.) appeared without visible cause. The triggering `<system-reminder>` blocks are not rendered to the user, so from the user's seat these lines looked like autonomous chatter or a possible injection.
2. The session injects an agent identity (`agent: Mavis`, `agentName: mavis`, `agentRole: orchestrator`) on every message. The assistant echoed that identity into a repository document (`Owner: Mavis / orchestrator session`), which surfaced an internal harness label inside public-facing project material. The user asked: who is Mavis, where did it come from, why is it there.
3. The user's working conclusion: upstream harness / prompt engineering injects these unexplained artefacts, degrading trust and making the session feel compromised.

Why it matters: user-visible behaviour that originates only in invisible injected layers reads as prompt injection; internal labels leaking into deliverables create attribution confusion in a public repository.

Action: when this is picked up, trace which upstream harness layer emits (a) the polling-reminder text, (b) the agent-identity block, and record the mapping in the same place as the reminder investigation above. Keep this entry short; do not expand it by re-litigating today's transcript.

## Test-environment-only failures (recorded for visibility, not actioned here)

- `packages/tui/test/unit/mcode-tools-integration.test.ts > mcode-tools command environment > uses the TUI runtime even when PATH resolves a different node`
  - Failure mode: spawned mock launcher exits 127, `dirname: command not found`.
  - Cause: nix-shell restricted PATH does not include coreutils. Same test passes on macOS / Windows CI.
  - Owner decision on 2026-10-03: leave as-is. The companion assertion in `test:artifact.test.mjs` covers the production CLI launch behaviour and passes here.

- `test/byok.test.mjs > BYOK runs without managed login and resumes its saved conversation`
  - Failure mode: 90-second suite timeout, child CLI cold-start exceeds 35-second child budget on NixOS.
  - Cause: NixOS-specific child-process startup latency. Same test passes on macOS arm64 in the same project.
  - Owner decision on 2026-10-03: leave as-is. Production behaviour exercised by the fixture is already covered by `test:capabilities` and `test:artifact`.

These items are recorded for traceability only. Do not raise follow-up PRs for either unless the underlying platform behaviour regresses or the test is extended.
