# Test expectations in Talos

A full local run of the TUI unit directory is green when `TALOS_NEUTRAL_RUNTIME` is unset. A run that
inherits `TALOS_NEUTRAL_RUNTIME=1` from a Talos session instead shows a fixed set of failures that are
not defects in the current tree. This page records what they are, why they happen, and how to tell
them apart from a real regression. Read it before investigating a failing suite in
`packages/tui/test/unit`.

## How the suites are meant to run

The verification gates and CI run these suites with `TALOS_NEUTRAL_RUNTIME` **unset**. The shipped CLI
sets `TALOS_NEUTRAL_RUNTIME=1` for itself (see [telemetry](telemetry.md) and
[capabilities](tui-capabilities.md)), and a desktop or terminal session that launched Talos can inherit
that variable into any test the shell starts afterwards. Clear it before judging a local run:

```powershell
$env:TALOS_NEUTRAL_RUNTIME = $null
pnpm exec vitest run --config vitest.oss.config.mjs packages/tui/test/unit
```

Note that the Windows verification profile (`pnpm verify --profile windows`) does not run this directory
at all, so a green gate list says nothing about it.

Measured on 2026-11-17 at `5e3e39e` with the variable cleared: 104 files and 2,622 tests, of which
**2,601 passed, 21 were skipped, and none failed**. That is the baseline to compare against.

## Category 1: neutral-profile failures, expected by design

Measured on 2026-11-16 with `TALOS_NEUTRAL_RUNTIME=1`: 104 files and 2,619 tests, of which 89 failed,
2,509 passed, and 21 were skipped. The failures are concentrated in fourteen files:

| Tests | File |
| --- | --- |
| 17 | `tui-app.test.ts` |
| 15 | `runtime-feedback-service.test.ts` |
| 9 | `incident-reporter-privacy.test.ts` |
| 9 | `runtime-feedback-diagnostic-upload.test.ts` |
| 8 | `cli-auth-command.test.ts` |
| 7 | `mcode-tools-integration.test.ts` |
| 6 | `tui-plugin-manager.test.ts` |
| 5 | `provider-application.test.ts` |
| 3 | `application-login-gate.test.ts` |
| 3 | `tui/controller/product/feature-flow.test.ts` |
| 3 | `tui/controller/projection/visible-presentation.test.ts` |
| 2 | `plugin-application.test.ts` |
| 1 | `business-telemetry-privacy.test.ts` |
| 1 | `headless-runner.test.ts` |

Re-measured on 2026-11-17 (`5e3e39e`, same variable set): 2,622 tests with 85 failures in the same
fourteen files. The `tui-app.test.ts` row falls to 13 because the four assertions described in
Category 2 are now repaired; the other rows are unchanged.

These suites were written against upstream MiniMax Code behavior that the neutral profile removes on
purpose. They assert a managed account or Token Plan sign-in, the official plugin catalog and managed
connectors, cloud `mcode-tools`, upstream telemetry and incident upload, and account-linked feedback
submission. With the neutral profile active those paths are unavailable, so the account readiness never
becomes `Login required`, the cloud commands exit with the documented "unavailable in Talos" message, and
the upload paths never open. Examples measured directly:

- `dist/mcode-tools.js --help` exits 1 with `Upstream cloud tools are unavailable in Talos.` while the
  variable is set, which fails `test:artifact` even though nothing in the source changed.
- `application-login-gate` and `visible-presentation` account-readiness cases pass 60/60 once the variable
  is unset.

With the variable cleared, the same run reports no failures at all, as the baseline above records.

## Category 2 (resolved): four stale permission assertions

Until 2026-11-17, `packages/tui/test/unit/tui-app.test.ts` failed four permission cases with or
without the neutral profile:

- `shows account status and resolves pending permission and questionnaire decisions`
- `denies a pending permission explicitly and releases the blocked interaction`
- `resolves a regular inline permission without clearing the terminal viewport`
- `surfaces only descendant permissions while keeping explicit Deny separate from Stop`

The cause was call shape, not behavior. `packages/tui/src/runtime/adapter.ts:703` declares
`replyPermission(agentName, requestId, decision, message?)`, and
`packages/tui/src/tui/controller/interaction/interaction-flow.ts:1211` fills the fourth slot with
`decision === 'deny' ? feedback : undefined`. The assertions expected three arguments, so
`toHaveBeenCalledWith('mavis', '<id>', 'allowOnce')` saw a fourth `undefined` and failed.

They are repaired on the test side (`5e3e39e`): each assertion now includes the fourth argument, and
a new case, `forwards deny guidance as the permission reply message`, covers the path the argument
exists for — a Deny that carries user guidance through to the Runtime and into the transcript detail.
Asserting the argument is stricter than dropping it, so this is not a relaxation of the suite.

The product side was left alone, because the call shape is the intended contract: the Runtime already
forwards `message` only when it has a value (`packages/local-runtime-v2/src/local/cli-service.ts:431`
spreads it conditionally), so passing an explicit `undefined` is not a wire difference.

## What this page does not claim

- A green unit directory is not evidence of live-service acceptance, and neither is this page.
- The upstream-coupled suites above are not repaired by documenting them. If the neutral profile is ever
  relaxed, they need to be revisited together with the capability and telemetry documents.
- Add a row here when a new failure class turns out to be environmental or intentionally unreachable,
  including the date and revision you measured it on.
