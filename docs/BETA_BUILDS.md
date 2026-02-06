# Beta Builds on Branches

This document describes how to produce and consume **beta** (and alpha) builds from branches, and how they integrate with GitHub pre-releases and auto-updates.

## Overview

- **Stable releases**: Built from **tags** via the [Building Release](.github/workflows/tag_push.yml) workflow (e.g. `v1.2.3`). They appear as the **Latest release** and use the `latest` update channel.
- **Beta builds**: Built from the **beta** (or **develop**) branch, or manually from any branch, via the [Beta Build](.github/workflows/beta_build.yml) workflow. They produce **GitHub pre-releases** (under "Pre-releases") and use the **beta** update channel so they do not replace "Latest release".

Beta installs receive updates from the **beta** channel only (plus stable when you promote). Stable installs receive only **latest** channel updates.

## Triggering a beta build

### Automatically (push)

Push to one of these branches to start a beta build:

- `beta`
- `develop`

Each run sets the app version to a unique prerelease version (e.g. `2.1.0-beta.<run_number>`) and publishes a new GitHub pre-release with installers and update metadata for the beta channel.

### Manually (branch picker)

1. Go to **Actions** → **Beta Build** → **Run workflow**.
2. Choose the **branch or ref** to build (e.g. `beta`, `main`, or a feature branch).
3. Optionally enable **Upload to App Store Connect / Windows Dev Center** if you want this run to be uploaded to TestFlight or the Windows Store (default is off).
4. Run the workflow.

The workflow checks out the selected ref, sets the version to `2.1.0-beta.<run_number>`, builds with `CHANNEL=beta`, and publishes to GitHub with `--publish always` so a release is created without pushing a tag.

## Versioning

- The workflow derives the version from `package.json` by stripping any existing `-beta.N` or `-alpha.N` suffix and appending `-beta.<run_number>` (e.g. `2.1.0-beta.11` → `2.1.0-beta.123`).
- That version is written back to `package.json` for the build, so the built app and the GitHub release both use it.
- Beta installs use this version to determine their update channel: if the version contains `-beta`, the app sets `autoUpdater.channel = 'beta'` and checks for updates on the beta channel.

## GitHub pre-releases

- Beta builds are published as **GitHub pre-releases** (via `releaseType: "prerelease"` in electron-builder when the channel is beta or alpha). They appear under **Pre-releases** on the repo, not as **Latest release**.
- Tag-based beta/alpha releases (e.g. `v2.1.0-beta.1`) are also created as pre-releases by the Building Release workflow.

## Store uploads (default: skipped)

- By default, the Beta Build workflow **does not** upload to App Store Connect or Windows Dev Center. Only the GitHub release is updated with installers and `latest-beta.yml` (and other artifacts).
- To upload a specific run to TestFlight or the Windows Store, run the workflow **manually** (workflow_dispatch) and set **Upload to App Store Connect / Windows Dev Center** to **true**. Store upload steps run only when this input is true and the trigger is `workflow_dispatch`.

## How beta installs get updates

1. The app version contains `-beta` (e.g. `2.1.0-beta.123`).
2. On startup, the main process sets `autoUpdater.channel = 'beta'` before calling `checkForUpdatesAndNotify()`.
3. electron-updater requests the **beta** channel manifest from GitHub (e.g. `latest-beta.yml`).
4. New beta releases published by the Beta Build workflow are offered as updates to existing beta installs; stable releases are also offered (beta channel includes stable).

## Documentation references

- [DEVELOPMENT.md](../DEVELOPMENT.md) – General build and signing.
- [NOTIFICATION_SYSTEM.md](NOTIFICATION_SYSTEM.md) – Building and testing notifications on Windows, macOS, and Linux.
