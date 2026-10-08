# Talos glossary

GUI and CLI documentation use the same names for different layers. Use this table before writing user-facing text or status cards.

| Term | Meaning | In documentation |
| --- | --- | --- |
| **Talos** | Public product brand. The terminal CLI is released; the desktop GUI is not. | Install guides, README, release notes |
| **Talos CLI** | This repository: TUI, `talos` command, headless mode, `talos acp`, providers, default `~/.talos` | Engine tasks and release facts live in [status](status.md) |
| **Talos desktop / GUI repo** | Companion repo `T3rra-C0d3-Talos`: `demo/`, `app/`, future Tauri shell | Visual canon and GUI-side ACP host evidence |
| **Perlica** | Default model-visible persona and display name; not a vendor or model claim | Separate from the connected model identity |
| **mavis** and similar | Internal agent keys, skill gates, storage fields | Label as **internal routing**; never the public product name |
| **MiniMax Code** | Upstream lineage, NOTICE/LICENSE attribution, some protocol fossils | Not the install target for this fork |
| **Release line vs capability baseline** | npm/source line (for example **0.1.2**) vs inherited upstream capability projection (for example **0.4.12**) | State both when discussing version; do not merge into one number |

## Which status card to read

| You are changing | Read first |
| --- | --- |
| CLI, TUI, prompts, release, verification | This repo [status](status.md) |
| GUI demo, `app/`, Tauri, visual acceptance | GUI repo `docs/status.md` |

Cross-repo work requires both cards. Do not infer engine release state from the GUI repository.
