# Flathub submission files

This directory contains the Flatpak manifest and metadata for submitting **Touch Typer** to [Flathub](https://flathub.org).

| File | Purpose |
|------|---------|
| `io.kochie.touch-typer.yml` | Flatpak build manifest (used by Flathub to build the app). |
| `io.kochie.touch-typer.desktop` | Desktop entry (menu/launcher). |
| `io.kochie.touch-typer.metainfo.xml` | AppStream metadata (store listing). |
| `generated-sources.json` | **You generate this** – not in repo. See [docs/FLATHUB.md](../docs/FLATHUB.md). |

Before opening a PR on [flathub/flathub](https://github.com/flathub/flathub):

1. Generate `generated-sources.json` from the pnpm lockfile:  
   `flatpak-node-generator pnpm pnpm-lock.yaml -o flathub/generated-sources.json --electron-node-headers`
2. In `io.kochie.touch-typer.yml`, set the release archive URL to a **stable** tag and fill in `sha256` (e.g. from `curl -sL <url> | sha256sum`).
3. Update the `<releases>` section in `io.kochie.touch-typer.metainfo.xml` with the new version and date.

Full steps: **[docs/FLATHUB.md](../docs/FLATHUB.md)**.
