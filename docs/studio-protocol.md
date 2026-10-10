# Talos studio protocol

Talos Desktop and other rich clients should use **`talos studio`**, not `talos acp` and not vendored `pi --mode rpc`.

- Transport: stdio, newline-delimited JSON
- Framing: JSON-RPC 2.0 requests/responses; server notifications omit `id` and use `{ "method", "params" }`
- Engine: same CliService as TUI/ACP (`surface: studio`)
- **Parity contract:** [studio-parity.md](studio-parity.md) (protocol version **2**)

## Lifecycle

1. Spawn `talos studio` with cwd set to the user workspace.
2. Call `studio/initialize` with optional absolute `cwd`.
3. Call `session/create` or `session/load`, then `turn/start`, `config/*`, `commands/list`, etc.

## Method index (v2)

See the parity matrix for the authoritative list. Core groups:

- **Session:** `list`, `create`, `load`, `close`, `delete`, `setMode`, `rename`, `archive`, `messages`, `activeRun`
- **Turn:** `start`, `cancel`, `steer`
- **Commands:** `commands/list` (slash + skills, same source as ACP)
- **Config:** `config/options`, `config/set`
- **Permission:** `permission/list`, `permission/reply`
- **Queue:** `queue/list`, `enqueue`, `update`, `delete`, `steer`, `continue`
- **Goal:** `goal/get`, `create`, `patch`, `clear` (when runtime enables goals)
- **Delegation:** `delegation/get`, `stop`
- **Inspection:** `inspection/context`, `usage`, `compact`, `skills`, `mcp`
- **Account / models:** `account/status`, `models/list`
- **Questionnaire:** `questionnaire/reply`
- **Session maintenance:** `fork`, `forkOptions`, `resume`, `rewindPreview`, `rewind`, `editMessage`, `inputSummaries`, `mcp/configure`, `mcp/clear`
- **Feedback / check-in:** `feedback/*`, `checkin/run`
- **Workspace:** `workspace/git`, `workspace/files/list`, `workspace/files/search`
- **Background tasks:** `backgroundTasks/list`
- **Runtime events:** `runtime/events/subscribe`, `runtime/events/unsubscribe`

## Notifications

| Method | When |
| --- | --- |
| `turn/event` | Stream payload is a Talos `TuiStreamEvent` |
| `turn/completed` | Turn finished (`succeeded`, `cancelled`, `failed`) |
| `runtime/event` | After `runtime/events/subscribe`; payload is `TuiRuntimeEvent` |

Implementation: `packages/tui/src/studio/`.
