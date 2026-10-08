# Security

This project is a source preview. Maintainers prioritize security issues on the default branch; no support period for older versions or response SLA has been committed.

Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/security/advisories/new) when available, or [open a security-related issue](https://github.com/PAKIKNOWLEDGE/Talos-Code-CLI/issues/new/choose) and ask maintainers to move the thread private. Do not put credentials, exploit details, or real user data in public issues or community chats.

If **Security → Advisories → Report a vulnerability** is available on GitHub, you can also use that private reporting channel. If it is unavailable, use the security email above.

The release coordinator, @hetaoBackend, coordinates security triage; see [Maintainers](docs/maintainers.md). No response SLA is currently promised.

Include the affected version, operating system and Node.js version, a minimal reproduction, expected and actual permission boundaries, and necessary redacted evidence. Use synthetic files and dedicated test accounts; do not test other people's accounts or infrastructure.

## Data and service boundaries

- The active data directory stores login state, provider configuration (including API keys in `config.yaml`), and sessions. Builds from this repository and the published npm CLI `@pakiknowledge/tal0s-code` default to `~/.talos` (or `~/.talos-<profile>` when a profile is selected). `MINIMAX_DATA_DIR` / `MAVIS_DATA_DIR` overrides still apply. Follow [Accounts and data](docs/installation.md#accounts-and-data) to identify the active directory; the installer location alone does not identify stored credentials. Restrict local access to every data directory you have used and keep them out of Git, including old profiles. They are not shareable project configuration.
- Models, official plugins, connectors, search, media, feedback, and telemetry may contact external services. Those services continue to control authorization and credits; source access does not grant access to accounts or third-party resources.
- mcode-tools obtains short-lived access tokens through the host's lease broker. Never pass refresh tokens to tool processes.
- Permissions and sandboxing do not replace review of untrusted plugins, MCP servers, and shell commands. If automatic permission classification is unavailable, retain user confirmation rather than allowing operations by default.
- If credentials leak, revoke or rotate them with the service first, then remediate files and Git history. Deleting the current file does not remove historical copies.

Scan source, Git history, and build artifacts separately. A passing scan does not guarantee the absence of unknown vulnerabilities.
