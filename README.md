# Talos

**A coding agent for your terminal. Bring your model, work in your project, and follow every step.**

[简体中文](README_ZH.md) · [Install](#install) · [Quick start](#quick-start) · [npm](https://www.npmjs.com/package/@pakiknowledge/tal0s-code)

![Talos welcome screen](docs/assets/talos-welcome.png)

Talos helps you explore a codebase, edit files, and run commands through a terminal conversation. Its Endfield-inspired interface keeps replies, tool activity, and permission requests close to the work. Choose a provider preset or connect your own compatible endpoint.

## Install

Requires Node.js **22.19–22.x, 24.2–24.x, 25.x, or 26.x**.

```sh
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
```

Install scripts are needed for native dependencies. Keep optional dependencies enabled.

## Quick start

Open a terminal in the project you want to work on:

```sh
cd /path/to/your/project
talos
```

1. Enter `/provider` to configure a model connection. Select a preset or supply your endpoint, model name, and API key.
2. Describe your task and the result you want. For example: “Explain how this project starts, then identify the files involved.”
3. Follow the replies and tool activity. Review permission requests when prompted.

Model usage is billed by your chosen provider.

![A conversation in Talos](docs/assets/talos-session.png)

*The background image and transparency in these screenshots are terminal settings.*

## Keep working

| Command | Use |
| --- | --- |
| `talos "Explain this repository"` | Start with a task. |
| `talos --continue` | Continue the latest session in the current workspace. |
| `talos --session` | Choose a session. |
| `talos exec "Explain this repository"` | Run a task without the interactive interface. |
| `talos acp` | Connect an Agent Client Protocol client. |
| `talos --help` | View command-line options. |

Inside Talos, use `/provider` for model connections, `/sessions` for history, and `/help` for commands and shortcuts.

## Your data

Configuration and sessions are stored in `~/.talos` by default (`%USERPROFILE%\.talos` on Windows). Uninstalling the npm package leaves this directory intact.

## Updates

Run `talos update` or enter `/update` to check for a new version. Talos shows the upgrade command; installation is always manual. To upgrade, run the npm install command above again.

Release notes: [0.1.1](docs/releases/0.1.1.md).

## Release status

Talos **0.1.1** is a CLI preview. Windows x64 installation and the existing release checks have passed. On NixOS (2026-10-03) the local full verification passed 12 of 14 gates; the two remaining failures are test-environment issues (a PATH-restricted launcher and a fixture timeout), not platform regressions — details in [verification records](docs/verification.md). Cross-platform validation is not yet complete.

The desktop GUI is separate work. Default web search is not included in this release.

If you encounter a problem, [open an issue](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/issues) with your OS, Node.js version, Talos version, and the error message. Remove API keys and private project content before sharing logs.

## Build from source

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and verification, and [source synchronization](docs/source-sync.md) for maintaining the fork.

## License and acknowledgements

Talos builds on open-source work from [MiniMax Code](https://github.com/MiniMax-AI/minimax-code), [pi-mono](https://github.com/badlogic/pi-mono), and other contributors. Copyright and license notices are retained in [LICENSE](LICENSE), [NOTICE](NOTICE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and [LEGAL.md](LEGAL.md).
