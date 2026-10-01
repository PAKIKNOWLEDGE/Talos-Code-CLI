# Talos CLI

[简体中文](README_ZH.md) · [npm](https://www.npmjs.com/package/@pakiknowledge/tal0s-code) · [Contributing](CONTRIBUTING.md)

A terminal coding agent with an Endfield-inspired interface, provider-neutral model configuration, and a workspace you control. Built on the MiniMax Code engine; published under its own package name and command.

![Talos 0.1.0 welcome screen](docs/assets/talos-welcome.png)

> **0.1.0 preview.** Windows x64 has passed the existing source and installed-package checks. NixOS installation testing is still pending. This release is the CLI; the companion GUI and Tauri desktop shell are not included.

## Install

Node.js **22.19–22.x, 24.2–24.x, 25.x, or 26.x** is required. Keep dependency install scripts and optional dependencies enabled so native SQLite and clipboard support can install.

```sh
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
talos --version
```

The command is `talos`. There is no `mcode` compatibility alias.

## Start in your project

```sh
cd /path/to/your/project
talos
```

Open `/provider` to add or select a model connection. Choose a provider preset or configure a custom API-compatible endpoint, model, and API key. Provider connections use the same setup flow; no MiniMax account is required. API usage is billed by your chosen provider.

Describe the task, its boundaries, and how to verify the result. Review tool output and permission requests as the agent works.

![Talos conversation and tool activity](docs/assets/talos-session.png)

The screenshots show a user-configured terminal background and transparency. Talos supplies the yellow terminal interface and text banner, not the wallpaper or terminal settings.

## Everyday commands

| Command | Purpose |
| --- | --- |
| `talos` | Open the interactive terminal interface in the current directory. |
| `talos "Explain this repository"` | Start with an initial task. |
| `talos --continue` | Continue the latest session in the current workspace. |
| `talos --session` | Open the session picker. |
| `talos exec "Explain this repository"` | Execute a task without the interactive interface. |
| `talos acp` | Connect an Agent Client Protocol client. |
| `talos update` | Check for a new version and show a manual npm upgrade command. |
| `talos --help` | Inspect available commands and options. |

In the TUI, `/provider` manages model connections, `/sessions` opens history, and `/help` lists commands and shortcuts.

## Data and updates

Default configuration and sessions live in `~/.talos` (`%USERPROFILE%\.talos` on Windows). Uninstalling the npm package does not remove this data. Keep API keys and private sessions out of Git.

Updates are advisory: Talos does not download or run an installer. Upgrade yourself with the install command above. Startup adds tool directories to the running process; persistent shell PATH integration is disabled unless explicitly enabled with `TALOS_ENABLE_SHELL_PATH_INTEGRATION=1`.

## Troubleshooting installation

- **Missing SQLite native bindings:** ensure dependency scripts were enabled. First check that `talos` resolves to the installation you just created; a pnpm installation can shadow an npm installation. Use `Get-Command talos -All` in PowerShell or `command -v talos` on Unix.
- **Windows cannot find `prebuild-install` or `node-gyp`:** an old terminal can retain an obsolete, overlong PATH. Completely close its host and reopen it. If needed, refresh only the current PowerShell environment before reinstalling:

```powershell
$env:Path = 'C:\Program Files\nodejs;' + [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
```

`--allow-scripts` is not recognized by the npm 11.12.1 installation used for Windows verification; it is not required by these instructions. A `prebuild-install` deprecation warning alone does not mean the install failed. If installation still fails, retain the final error and avoid deleting your profile or changing system permissions.

## Preview scope

The terminal interface, provider configuration, tools, sessions, and ACP entry are included. Default web search is deferred; user-configured MCP search has not been live validated. GUI/Tauri work is separate. NixOS support is not yet verified; report native-library or executable-loading failures with the exact error.

## Develop

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

The source workspace stays private to prevent accidental publication. Release packages are prepared separately. See [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), and the [source synchronization contract](docs/source-sync.md) for repository boundaries, verification, and reviewed upstream updates. Some inherited technical documents still describe upstream MiniMax Code; this README describes the Talos distribution.

## License and upstream

Talos is a fork of [MiniMax Code](https://github.com/MiniMax-AI/minimax-code), incorporating [pi-mono](https://github.com/badlogic/pi-mono) and other components. Original copyright and attribution are retained. See [LICENSE](LICENSE), [NOTICE](NOTICE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and [LICENSE-STATUS.md](LICENSE-STATUS.md) for the applicable licenses and exceptions.
