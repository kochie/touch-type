# Submitting Touch Typer to Flathub

This guide walks through submitting the app to [Flathub](https://flathub.org) so users can install it with `flatpak install flathub io.kochie.touch-typer`.

## Overview

Flathub does **not** accept pre-built `.flatpak` uploads. They build from source using a **Flatpak manifest** (YAML) and a **dependency manifest** (generated from your lockfile). You submit by opening a **pull request** on [github.com/flathub/flathub](https://github.com/flathub/flathub) against the `new-pr` branch with the required files.

## Prerequisites

- [Flatpak](https://flatpak.org/setup/) and `flatpak-builder` installed
- [flatpak-node-generator](https://github.com/flatpak/flatpak-builder-tools/tree/master/node) (for npm dependency manifest):
  ```bash
  pipx install git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node
  ```
- A **stable release** of Touch Typer (Flathub only accepts stable; beta builds go to the beta repo and are not listed on the website)

## Step 1: Prepare dependency manifest (offline build)

Flathub builds with **no network access**. All npm dependencies must be in a `generated-sources.json` file.

This project uses **pnpm**; Flathub’s tooling expects **npm** or yarn. Use npm only for the Flathub build:

1. Generate a `package-lock.json` without installing (keeps your pnpm layout unchanged):
   ```bash
   npm install --package-lock-only
   ```
   Commit `package-lock.json` so the release tarball (e.g. from a git tag) includes it.

2. Run the Flatpak Node generator (use `--electron-node-headers` so native deps match Electron):
   ```bash
   flatpak-node-generator npm package-lock.json -o flathub/generated-sources.json --electron-node-headers
   ```

3. You will add `flathub/generated-sources.json` only in the **Flathub PR** (do not commit it to the app repo if you prefer). In the PR, place it next to the manifest so the path in the manifest (e.g. `generated-sources.json`) is correct.

## Step 2: AppStream (Metainfo) and desktop file

Flathub requires:

- A **Metainfo** (AppStream) file for the store listing.
- A **desktop file** for the app menu.

The manifest in `flathub/io.kochie.touch-typer.yml` expects:

- `io.kochie.touch-typer.metainfo.xml` (in the app source)
- `io.kochie.touch-typer.desktop` (in the app source)

You can add these under `flathub/` in this repo (and copy them into the app in the manifest’s build) or ship them from the app root. The manifest installs them into `/app/share/metainfo` and `/app/share/applications`. Use the same app-id: `io.kochie.touch-typer`.

## Step 3: Test the build locally

1. Add the Flathub remote and install the Electron BaseApp and Builder:
   ```bash
   flatpak remote-add --if-not-exists --user flathub https://dl.flathub.org/repo/flathub.flatpakrepo
   flatpak install --user flathub org.flatpak.Builder
   ```
2. From the **flathub** repo (or the directory that contains the manifest and `generated-sources.json`), run:
   ```bash
   flatpak run --command=flathub-build org.flatpak.Builder --install flathub/io.kochie.touch-typer.yml
   ```
3. Run the app:
   ```bash
   flatpak run io.kochie.touch-typer
   ```
4. Run the linter:
   ```bash
   flatpak run --command=flatpak-builder-lint org.flatpak.Builder manifest flathub/io.kochie.touch-typer.yml
   ```

Fix any errors before submitting.

## Step 4: Open the Flathub submission PR

1. Fork [flathub/flathub](https://github.com/flathub/flathub) (**do not** check “Copy the master branch only”).
2. Clone your fork and base your branch on `new-pr`:
   ```bash
   git clone --branch=new-pr git@github.com:YOUR_USERNAME/flathub.git && cd flathub
   git checkout -b add-io.kochie.touch-typer
   ```
3. Add the required files for the app (layout may vary; often one folder per app):
   - `io.kochie.touch-typer.yml` (the Flatpak manifest)
   - `flathub.json` (optional; only if you need to limit architectures, etc.)
   - `generated-sources.json` (or the path referenced in the manifest)
   - Any Metainfo/desktop files if they are not in the app source

   Copy the manifest from this repo’s `flathub/` directory and ensure the `sources` in the manifest point to a **stable** release archive (e.g. `https://github.com/kochie/touch-type/archive/refs/tags/v2.1.0.tar.gz`) and that the dependency source path (e.g. `generated-sources.json`) matches the path in the flathub repo.

4. Commit and push, then open a **pull request against the `new-pr` branch** (not `master`).
5. Title the PR: **Add io.kochie.touch-typer**.

## Step 5: Review and approval

- Flathub reviewers will comment on the PR. Address all feedback.
- To trigger a test build, comment: `bot, build`.
- After approval, Flathub will merge and create a new repo under the [Flathub GitHub organisation](https://github.com/flathub/). You’ll get an invite for write access—accept it (with 2FA enabled).
- After the first official build, the app will appear on [flathub.org](https://flathub.org).

## App ID and domain

- **App ID:** `io.kochie.touch-typer` (matches electron-builder and your domain).
- **Domain:** `io.kochie` → `kochie.io`. You should control this domain; for verification you may need to place a file at `https://kochie.io/.well-known/org.flathub.VerifiedApps.txt` (see [Flathub verification](https://docs.flathub.org/docs/for-app-authors/verification)).

## Useful links

- [Flathub submission docs](https://docs.flathub.org/docs/for-app-authors/submission/)
- [Flathub requirements](https://docs.flathub.org/docs/for-app-authors/requirements/)
- [Flathub linter](https://docs.flathub.org/docs/for-app-authors/linter/)
- [flatpak-node-generator (npm/yarn)](https://github.com/flatpak/flatpak-builder-tools/tree/master/node)
- [Electron BaseApp](https://github.com/flathub/electron-sample-app)
