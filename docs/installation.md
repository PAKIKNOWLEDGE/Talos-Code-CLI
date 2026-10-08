# Installation and source builds

Talos CLI ships as **`@pakiknowledge/tal0s-code`** from [PAKIKNOWLEDGE/Talos-Code-CLI](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI). The command is **`talos`**; default user data is **`~/.talos`** (`%USERPROFILE%\.talos` on Windows). See [glossary](glossary.md) for how Talos relates to upstream MiniMax Code lineage.

## Install from npm (recommended)

Requires Node.js **22.19–22.x, 24.2–24.x, 25.x, or 26.x**.

```bash
npm install -g @pakiknowledge/tal0s-code@latest --registry=https://registry.npmjs.org/ --ignore-scripts=false --include=optional
talos --version
```

Keep optional dependencies enabled and allow native install scripts (for example `better-sqlite3`). For a pinned version, replace `@latest` with `@0.1.2` (or the version you intend to ship).

Release archives and maintainer steps: [releasing](releasing.md) and [releases/](releases/).

## Install a GitHub release archive

When a release tarball is published on [GitHub Releases](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/releases), download `pakiknowledge-tal0s-code-X.Y.Z.tar.gz` and the matching `.sha256`, then:

```bash
sha256sum -c pakiknowledge-tal0s-code-X.Y.Z.tar.gz.sha256   # macOS: shasum -a 256 -c ...
npm install --global ./pakiknowledge-tal0s-code-X.Y.Z.tar.gz --registry=https://registry.npmjs.org/ --include=optional --ignore-scripts=false
talos --version
```

## Build from this repository

Prerequisites: Git, Node.js (supported lines above), pnpm **9.12.0**.

On Windows, check out on a **local NTFS** volume (not a cloud-synced folder). Run the Windows location preflight before `pnpm install`:

```bash
git clone https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI.git
cd Talos-Code-CLI
corepack enable
corepack prepare pnpm@9.12.0 --activate
node scripts/check-windows-source-location.mjs
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`pnpm start` runs the built CLI (`dist/cli.js`). To use the build in another project directory:

```bash
cd /path/to/your/project
node /absolute/path/to/Talos-Code-CLI/dist/cli.js
```

Do not overwrite another global `talos` install unless you intend to.

Upstream [MiniMax Code](https://github.com/MiniMax-AI/minimax-code) is lineage only; this fork does not publish `@minimax-ai/code` or the `mcode` command.

## Accounts and data

| Artifact | Default data directory |
| --- | --- |
| Published npm `@pakiknowledge/tal0s-code` | `~/.talos` |
| Build from this repository | `~/.talos` |

A selected profile uses `~/.talos-<profile>`. Overrides: non-empty `MINIMAX_DATA_DIR` or `MAVIS_DATA_DIR` (legacy names, still honored) before the default.

Login, provider configuration, caches, and sessions live under the active data directory. Uninstalling the npm package does **not** remove that directory.

For disposable tests, point overrides at a temporary path:

```bash
export MINIMAX_DATA_DIR=/path/to/test-profile    # POSIX
# PowerShell: $env:MINIMAX_DATA_DIR = 'C:\path\to\test-profile'
```

To locate data safely: identify the launcher (`command -v talos` / `Get-Command talos`), run `talos --version`, check whether overrides are set, and protect every directory that may contain credentials — do not paste `config.yaml` or session contents into issues.

## macOS terminal shortcuts (Ghostty Option+M)

In the composer, `Alt+M` (`Option+M` on macOS) cycles permission modes (`composer.cycle-permission`). `Shift+Tab` toggles Plan mode. Use `/permission` and `/hotkeys` to inspect or rebind.

If `Option+M` inserts `µ`, configure Ghostty's [`macos-option-as-alt`](https://ghostty.org/docs/config/reference#macos-option-as-alt) or bind `composer.cycle-permission` to another key in `<data-dir>/tui/keybindings.json` (default profile: `~/.talos/tui/keybindings.json`). Run `/reload` after editing keybindings.

## Update or remove

Upgrade by running the npm install command again, or follow `talos update` / `/update` for the displayed command. See [README uninstall](../README.md) for package removal; user data under `~/.talos` remains unless you delete it manually.
