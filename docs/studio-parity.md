# Studio protocol parity (Talos CLI)

Studio (`talos studio`) must expose every **in-session** capability the interactive CLI/TUI can drive through `TuiRuntime`, matching what `talos acp` already maps today plus inspection, session maintenance, workspace reads, and host-adjacent runtime APIs.

## Not in studio (CLI-only host commands)

These stay terminal subcommands; Desktop uses OS/Tauri or separate tooling:

| CLI command | Reason |
| --- | --- |
| `talos` (interactive TUI) | Terminal UI; studio replaces only the **protocol** layer |
| `talos exec` | One-shot; studio `turn/start` is equivalent |
| `talos login` / `logout` / `update` | Host auth and install |
| `talos provider` / `plugin` / `telemetry` | Admin surfaces |
| `talos init` | Launches TUI with `/init` |

## Parity matrix

Protocol version **2** (`STUDIO_PROTOCOL_VERSION`). Each row must have a `studio` method before Desktop marks studio migration **pass**.

| Runtime / ACP source | Studio method | v2 |
| --- | --- | --- |
| `studio/initialize` | `studio/initialize` | yes |
| `session/list` | `session/list` | yes |
| `session/new` → create | `session/create` | yes |
| `session/load` | `session/load` | yes |
| `session/resume` | `session/resume` | yes |
| `session/close` | `session/close` | yes |
| `session/delete` | `session/delete` | yes |
| `session/setMode` | `session/setMode` | yes |
| `session/rename` | `session/rename` | yes |
| `session/archive` | `session/archive` | yes |
| `session/fork` | `session/fork`, `session/forkOptions` | yes |
| `getSessionForkOptions` | `session/forkOptions` | yes |
| `session/prompt` | `turn/start` | yes |
| `session/cancel` | `turn/cancel` | yes |
| `mcode/session/steer` | `turn/steer` | yes |
| `available_commands` | `commands/list` | yes |
| `session/setConfigOption` | `config/set` | yes |
| modes + config snapshot | `config/options` | yes |
| `permission/*` | `permission/list`, `permission/reply` | yes |
| `mcode/session/queue/*` | `queue/list`, `enqueue`, `update`, `delete`, `steer`, `continue` | yes |
| `mcode/session/goal/*` | `goal/get`, `create`, `patch`, `clear` | yes |
| `mcode/session/delegation/*` | `delegation/get`, `stop` | yes |
| `getMessages` / `listMessagePage` | `session/messages` | yes |
| `listSessionInputSummaries` | `session/inputSummaries` | yes |
| `getSessionRewindPreview` | `session/rewindPreview` | yes |
| `rewindSession` | `session/rewind` | yes |
| `editSessionMessage` | `session/editMessage` | yes |
| `configureSessionMcpServers` | `session/mcp/configure` | yes |
| `clearSessionMcpServers` | `session/mcp/clear` | yes |
| `getContextSnapshot` | `inspection/context` | yes |
| `getSessionUsage` | `inspection/usage` | yes |
| `requestCompaction` | `inspection/compact` | yes |
| `listSkills` | `inspection/skills` | yes |
| `listMcpServers` | `inspection/mcp` | yes |
| `getRuntimeDiagnostics` | `inspection/diagnostics` | yes |
| `getInstructionSources` | `inspection/instructionSources` | yes |
| `listModels` | `models/list` | yes |
| `getAccountStatus` | `account/status` | yes |
| `getActiveRun` | `session/activeRun` | yes |
| `continueQueue` | `queue/continue` | yes |
| `replyQuestionnaire` | `questionnaire/reply` | yes |
| `prepareFeedback` / `submitFeedback` / `cancelFeedback` | `feedback/prepare`, `submit`, `cancel` | yes |
| `runDailyCheckin` | `checkin/run` | yes |
| `getWorkspaceGitMetadata` | `workspace/git` | yes |
| `listWorkspaceFileTree` | `workspace/files/list` | yes (when runtime exposes port) |
| `searchWorkspaceFiles` | `workspace/files/search` | yes (when runtime exposes port) |
| `listWorkspaceFileTreeCandidates` | `workspace/files/candidates` | yes (when runtime exposes method) |
| `searchWorkspaceFileCandidates` | `workspace/files/searchCandidates` | yes (when runtime exposes method) |
| `listBackgroundTasks` | `backgroundTasks/list` | yes (empty when runtime omits port) |
| `watchEvents` push | `runtime/events/subscribe` → `runtime/event` notify | yes |
| `inspectProjectMcp` | `inspection/projectMcp` | yes |
| `getSessionUsageSummary` | `inspection/usageSummary` | yes (when runtime exposes method) |
| `getPendingQuestionnaire` / `getLatestPlanReview` / `dismissQuestionnaire` | `questionnaire/getPending`, `getPlanReview`, `dismiss` | yes |
| `McodePluginRuntimeAccess` | `plugins/listInstalled`, `listMarketplace`, `mutate`, `refresh` | yes |

| `watchSessionUsageCommits` | `usage/commits/subscribe` → `usage/commit` notify | yes (when runtime exposes method) |

| `watchSessionTurn` | `turn/watch` (reconnect to an in-flight turn) | yes |

`turn/start` streams new turns via `turn/event` notifications.

Update this table when adding methods; bump `STUDIO_PROTOCOL_VERSION` on breaking changes.
