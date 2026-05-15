# Development Guide

## Prerequisites

- Node.js 18+
- pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Docker (required for local Supabase)
- Xcode (required for macOS builds, install from App Store)
- Xcode Command Line Tools: `xcode-select --install`

## Getting Started

```shell
pnpm install
```

## macOS Local Building

This section documents how to build the Electron app locally on macOS for development and testing purposes.

### Understanding Build Targets

The app has multiple macOS build targets defined in `electron-builder.ts`:

| Target | Purpose | Requirements |
|--------|---------|--------------|
| `default` | Standard macOS app (DMG + ZIP) | Developer ID certificate (for distribution) |
| `mas` | Mac App Store release | MAS Distribution certificate + provisioning profile |
| `masDev` | Local MAS testing | Development certificate + dev provisioning profile |

### Quick Start: Unsigned Local Build

For local development and testing without code signing:

```shell
# Build renderer (Next.js) and electron main process
pnpm build

# Create unsigned app bundle for local testing
pnpm package:mac-unsigned
```

This uses the `package:mac-unsigned` script which runs:
```shell
electron-builder build -c.mac.identity=null --publish never
```

The unsigned app will be created in the `dist/` directory.

### Environment Variables for Code Signing

When building for distribution, you need to set these environment variables:

| Variable | Description | Required For |
|----------|-------------|--------------|
| `CSC_IDENTITY_AUTO_DISCOVERY` | Set to `false` to disable code signing | Unsigned builds |
| `MAC_LINK` | Base64-encoded .p12 certificate file | Signed builds (CI) |
| `MAC_KEY_PASSWORD` | Password for the .p12 certificate | Signed builds (CI) |
| `BUNDLE_VERSION` | Build number (CI: from repo variable `APP_STORE_BUILD_NUMBER`) | App Store builds |

**App Store build number (CI):** Uploads to App Store Connect require a single, globally incrementing build number across all workflows. The number is stored in a repository variable `APP_STORE_BUILD_NUMBER` (Settings → Actions → Variables). The workflows `beta_build` and `tag_push` reserve the next number via `.github/workflows/reserve-app-store-build-number.yml`. You must add a secret **REPO_VARIABLES_PAT** (a PAT with permission to read/write repository variables: Classic PAT with `repo` scope, or Fine-grained PAT with Administration → Read and write). Optional: add variable `APP_STORE_BUILD_NUMBER` with your last uploaded build number; if missing, the first run creates it at 1.

**Notarization credentials (choose one method):**

| Method | Variables | Description |
|--------|-----------|-------------|
| API Key (recommended) | `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` | App Store Connect API key |
| Legacy | `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Apple ID with app-specific password |

The build config automatically detects whether notarization credentials are available:
- **Credentials set**: Notarization is enabled
- **No credentials**: Notarization is disabled (no more "unable to generate" warning)

### Build Commands

```shell
# Development mode (hot reload, no packaging)
pnpm dev

# Build without packaging (creates main/ and renderer/out/)
pnpm build

# Create app bundle in dist/ directory (no DMG/signing)
pnpm pack-app

# Unsigned local build (recommended for basic local testing)
pnpm package:mac-unsigned

# MAS development build — sandbox-tested locally. See "Testing MAS Build
# Locally" below for required Keychain Access setup before this works.
pnpm package:mac-mas-dev

# Full signed release build - all platforms (CI)
pnpm build+release

# macOS release with both targets: default + MAS (CI)
pnpm build+release:mac
```

**Important**: Targets are now specified via CLI, not hardcoded in the config.
This prevents double-signing when building a single target.

#### Renderer prerender requires the Temporal polyfill

The renderer uses `Temporal` (the new ECMAScript date/time API) as an implicit
global throughout `src/components/Tracker`, `src/components/settings`,
`src/app/streak`, etc. Chromium 132+ ships Temporal natively, so the actual
running app has it — but **Node does not**, and `next build renderer` runs
prerendering in Node, which would crash with `ReferenceError: Temporal is
not defined` at the first module that touches it.

The fix is wired into the SSR layer:

- `@js-temporal/polyfill` is a runtime dependency.
- `renderer/src/lib/temporal-polyfill.ts` installs the polyfill onto
  `globalThis.Temporal` *only when undefined* (so browsers with native
  support skip it).
- `renderer/src/app/layout.tsx` imports it as a side effect on the **first
  line** — it must stay first so the polyfill loads before any page or lib
  chunk that references `Temporal`.

If `pnpm build-renderer` ever fails with `ReferenceError: Temporal is not
defined` on `/_not-found` or any other route, the most likely cause is that
the polyfill import was reordered or removed from `layout.tsx`. The
`/_not-found` page in the error message is a red herring — it's just the
first page Next.js tries to prerender; any page would fail the same way.

### Common Build Issues and Solutions

#### 1. Code Signing Errors

**Problem**: Build fails with certificate/signing errors when you don't have certificates.

**Solution**: Disable code signing for local development:

```shell
# Option 1: Environment variable
export CSC_IDENTITY_AUTO_DISCOVERY=false
pnpm build+release

# Option 2: Use the unsigned build script
pnpm package:mac-unsigned
```

#### 2. Notarization Issues

**Problem A**: Build shows "skipped macOS notarization reason=`notarize` options were unable to be generated"

**Solution**: This warning appeared when notarization credentials weren't set. The config has been updated to automatically disable notarization when no credentials are found. You should no longer see this warning.

**Problem B**: Build hangs during notarization step.

**Solution**: If you have credentials set and notarization times out:

1. Increase the notarytool timeout:
   ```shell
   defaults write com.apple.gke.notary.tool nt-upload-connection-timeout 300
   ```

2. Or temporarily disable notarization by unsetting the env vars:
   ```shell
   unset APPLE_API_KEY APPLE_API_KEY_ID APPLE_API_ISSUER
   unset APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID
   ```

**Problem C**: You want to test with notarization locally.

**Solution**: Set up App Store Connect API credentials:

1. Go to [App Store Connect > Users and Access > Keys](https://appstoreconnect.apple.com/access/api)
2. Generate a new API key with "Developer" access
3. Download the .p8 file
4. Set environment variables:
   ```shell
   export APPLE_API_KEY=/path/to/AuthKey_XXXXX.p8
   export APPLE_API_KEY_ID=XXXXX
   export APPLE_API_ISSUER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

#### 3. Provisioning Profile Not Found

**Problem**: MAS builds fail because provisioning profile is missing.

**Solution**: For MAS builds, you need:
- `build/mas-touchtyper.provisionprofile` (production)
- `build/mas-touchtyper-dev.provisionprofile` (development)

For local testing without MAS, use unsigned build or remove MAS from targets:

```shell
# Build only default target (DMG/ZIP), skip MAS
electron-builder build --mac default -c.mac.identity=null --publish never
```

#### 4. Icon Errors

**Problem**: Icon-related build errors.

**Current Setup**: The project uses `build/icon.icon` (Xcode 26+ format). If you encounter issues:

```shell
# Verify icon.icon structure
ls -la build/icon.icon/

# Fallback: Use icns format
# Change in electron-builder.ts:
# icon: "build/app-icon.icns",
```

#### 5. Info.plist Conflicts (Development Mode)

**Problem**: Deep linking doesn't work in dev mode.

**Solution**: Run the replace-info script:

```shell
pnpm replace-info
```

This modifies Electron's Info.plist to use your app's bundle ID for URL scheme handling.

#### 6. Native Dependencies / Rebuild Required

**Problem**: Native modules fail to load.

**Solution**: Rebuild native dependencies for your Electron version:

```shell
pnpm run postinstall
# This runs: electron-builder install-app-deps
```

#### 7. Push Notifications Fail in Unsigned Builds

**Problem**: When enabling notifications, you get an error like:
```
NSOSStatusErrorDomain { NSDebugDescription = "Bundle identifier mismatch" }
```

**Cause**: Apple Push Notification Service (APNS) requires:
- The app to be properly code signed
- The bundle identifier to be registered with Apple Developer
- Valid `aps-environment` entitlement

Unsigned builds cannot register with APNS because Apple cannot verify the bundle identity.

**Solution**: The app now detects unsigned/development builds and gracefully skips APNS registration. For local testing:

1. **Use local notifications instead**: The app should fall back to local `Notification` API for testing
2. **Test push in signed builds**: Use `mas-dev` target with a development provisioning profile
3. **Ignore the error in dev**: The error is expected for unsigned builds

To test notifications with a signed dev build:

```shell
# Requires development certificate and provisioning profile
electron-builder build --mac mas-dev --publish never
```

#### 8. ARM64 vs x64 vs Universal

**Problem**: App crashes on different Mac architectures.

The config builds universal binaries by default (`arch: ["universal"]`). For faster local builds:

```shell
# Build only for your current architecture
electron-builder build --mac --publish never

# Explicitly build for arm64 only (M1/M2 Macs)
electron-builder build --mac --arm64 --publish never

# Explicitly build for x64 only (Intel Macs)
electron-builder build --mac --x64 --publish never
```

### Full Local Build Workflow

Here's a complete workflow for local macOS testing:

```shell
# 1. Clean previous builds
pnpm clean

# 2. Install dependencies
pnpm install

# 3. Build renderer and main process
pnpm build

# 4. Create unsigned app for testing
CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder build --mac --publish never

# 5. Run the built app
open dist/mac-arm64/Touch\ Typer.app
# or for Intel Macs:
open dist/mac/Touch\ Typer.app
```

### Testing MAS Build Locally

`pnpm package:mac-mas-dev` produces a fully App Store-sandboxed `.app` you can
install locally and exercise exactly the same way Apple's review process will.
This is what you want for sandbox-impact testing: file access redirects to the
container, APNS uses the sandbox servers, StoreKit IAP runs against sandbox
testers, etc.

The electron-builder config handles signing/entitlements/profile selection
automatically. But getting a successful launch on a fresh machine requires
three categories of one-time setup: **Apple Developer Portal**, **this Mac's
Keychain**, and **this Mac's Developer Mode**. Skip any and you'll hit
something between a confusing prompt and a silent launch failure.

#### Phase 1 — Apple Developer Portal setup

1. **Find this Mac's Provisioning UDID** (NOT the Hardware UUID — see below):

   ```shell
   system_profiler SPHardwareDataType | grep "Provisioning UDID"
   # Example output: Provisioning UDID: 00006020-000C60A21AC0C01E
   ```

   ⚠️ **Gotcha**: Apple Silicon Macs have *two* identifiers that look almost
   identical in format. The **Hardware UUID** (`CFBA26B6-...`, RFC 4122 style)
   is used for iCloud / system identity. The **Provisioning UDID**
   (`00006020-...`, compact 8-4-12) is what Mac development provisioning
   profiles bind to. They are NOT interchangeable. Registering the Hardware
   UUID by mistake produces a profile that validates at sign time but fails
   at launch with `AppleMobileFileIntegrityError Code=-413 "No matching
   profile found"` and `Unsatisfied entitlements:
   com.apple.developer.team-identifier,
   com.apple.developer.aps-environment`.

2. **Register this Mac as a device** (Developer Portal → Devices → `+`):
   platform = macOS, device ID = the **Provisioning UDID** from step 1.

3. **Confirm the App ID has App Groups enabled** (Developer Portal →
   Identifiers → `io.kochie.touch-typer` → Edit). Electron requires the
   implicit app group `TEAM_ID.BUNDLE_ID` for IPC between the main process
   and the sandboxed Helper processes (renderer / GPU / plugin). Without it,
   AMFI rejects the bundle at launch because the signed entitlements claim
   an `application-groups` capability the profile doesn't authorize.

4. **Generate the Mac App Development profile** (Developer Portal →
   Profiles → `+` → macOS App Development): App ID
   `io.kochie.touch-typer`, your Apple Development cert, the device from
   step 2, and explicitly select the App Group when prompted. Download and
   save as `build/mas-touchtyper-dev.provisionprofile`.

#### Phase 2 — This Mac's Keychain setup

The `Apple Development` certificate needs to be in a place where `codesign`
can use it without triggering interactive prompts during the multi-thousand
file signing pass that builds an Electron app.

1. **Confirm the cert is reachable**:

   ```shell
   security find-identity -v -p codesigning
   ```

   You should see `Apple Development: Robert Koch` listed. If you only see
   it under `/Library/Keychains/System.keychain`, you'll hit the prompts
   described below on macOS 26.

2. **macOS 26 (Tahoe) System keychain auto-locks on sleep** — manifesting as
   a modal "codesign wants to use the 'System' keychain. Enter an
   administrator's name and password" prompt the first time you build after
   the Mac wakes from sleep. Disable it once:

   ```shell
   sudo security set-keychain-settings /Library/Keychains/System.keychain
   ```

3. **Private-key ACL** — modal dialog with `Allow / Always Allow / Deny`.
   The first build run will trigger one per identity. **Click "Always
   Allow"** on each — that stores a permanent grant in the key's ACL so
   future builds are silent.

   If `Always Allow` isn't offered (only `Allow` / `Deny`), the partition
   list on the keys is restrictive — clear it:

   ```shell
   sudo security set-key-partition-list \
     -S apple-tool:,apple:,codesign: \
     -s -k YOUR_LOGIN_PASSWORD \
     /Library/Keychains/System.keychain
   ```

   Then click `Always Allow` on the next prompt.

4. **macOS 26's `system-keychain-2.db`** is a new SQLite-backed system
   keychain that the legacy `security` CLI can't enumerate. Private keys
   for Apple Development certs sometimes end up there. The `set-keychain-settings`
   and partition list commands above are still effective because they
   modify the access path even when the key storage itself is opaque.

#### Phase 3 — This Mac's Developer Mode

Apple Silicon Macs (macOS 13+) require **Developer Mode** to be on for AMFI
to allow `Apple Development`-signed binaries with `get-task-allow=true` to
run. Without it, the binary is SIGKILL'd at exec time before any code
executes (no crash report generated, exit code 137):

```shell
sudo DevToolsSecurity -enable
DevToolsSecurity -status   # should report "Developer mode is currently enabled."
```

This is a one-time setting. It enables `taskgated` to allow debugger
attachment to development-signed apps and tells AMFI to skip the
"distribution-only" check for `Apple Development`-signed apps.

> Developer Mode is unrelated to Developer ID. Developer ID apps (your
> regular DMG/ZIP releases) don't trigger this check because they don't
> claim `get-task-allow`. Only Apple Development signed apps do, which is
> why your standard non-MAS builds run fine on a Mac that's never had
> Developer Mode enabled.

#### Phase 4 — Build and launch

```shell
# IMPORTANT: pnpm package:mac-mas-dev does NOT rebuild the renderer or main
# process — it only packages what's already in main/ and renderer/out/. If
# either is stale or partially written, electron-builder will happily ship
# the broken bundle. Always run `pnpm build` first for a clean local test.
pnpm build && pnpm package:mac-mas-dev

# Launch
open "dist/mas-dev-arm64/Touch Typer.app"
```

If you've only changed Electron main process code, `pnpm build-electron &&
pnpm package:mac-mas-dev` is faster (skips the Next.js export).

#### Why `package:mac-mas-dev` works without env-var overrides

The config (`electron-builder.ts`) wires up four things automatically when
`--mac mas-dev` is on the command line:

- `mac.provisioningProfile` → `build/mas-touchtyper-dev.provisionprofile`
  (intermediate signing pass)
- `masDev.provisioningProfile` → same path (final outer-bundle pass)
- `mac.identity` → `"Apple Development"` (intermediate pass — conditional on
  `buildingMasDev`)
- `masDev.identity` → `"Apple Development"` (final pass)

Both passes share the identity, which is critical: electron-builder runs an
intermediate "darwin sign" pass on the universal MAS bundle that signs all
nested helper apps and Frameworks; the final pass only re-signs the outer
`.app`. If only the final pass has an explicit identity, nested bundles get
ad-hoc signed and the app fails launch with
`RBSRequestErrorDomain code 5 / launchd error 163`.

#### Override hooks (rarely needed)

If you need to point at a different provisioning profile (e.g. you have
multiple Apple Developer accounts), set `MAC_PROVISIONING_PROFILE`. The
config respects that env var ahead of the automatic path resolution.

```shell
MAC_PROVISIONING_PROFILE=path/to/other.provisionprofile pnpm package:mac-mas-dev
```

#### Verifying the result

```shell
# Should print "valid on disk" + "satisfies its Designated Requirement"
codesign --verify --deep --strict --verbose=2 "dist/mas-dev-arm64/Touch Typer.app"

# Every nested .app should show Authority=Apple Development:..., none ad-hoc
find "dist/mas-dev-arm64/Touch Typer.app" -name "*.app" -o -name "*.framework" | \
  while read p; do
    echo "$p"
    codesign -dvv "$p" 2>&1 | grep '^Authority='
  done

# Should show Platform=OSX, your team, this Mac's Provisioning UDID
# (00006020-... format, NOT the CFBA26B6-... Hardware UUID)
security cms -D -i "dist/mas-dev-arm64/Touch Typer.app/Contents/embedded.provisionprofile"
```

Container redirects: sandboxed writes land in
`~/Library/Containers/io.kochie.touch-typer/Data/Library/...` instead of
`~/Library/...`. APNS registration uses the **sandbox** APNs servers (dev
environment). StoreKit IAP runs against your App Store Connect sandbox
testers.

#### Diagnosing launch failures (`RBSRequestErrorDomain code 5`)

When the bundle launches via `open` and you get this error:

```
Error Domain=RBSRequestErrorDomain Code=5 "Launch failed."
NSUnderlyingError = NSPOSIXErrorDomain Code=163 "Launchd job spawn failed"
```

The error is opaque because LaunchServices wraps three layers of
rejection. Get the actual reason from the kernel/amfid logs. Save the
following to `/tmp/probe.sh` and run it:

```bash
#!/bin/bash
pkill -9 "Touch Typer" 2>/dev/null
sleep 1
LOG=/tmp/amfi-launch.log
log stream --style compact \
  --predicate 'sender == "amfid" OR senderImagePath CONTAINS "AppleMobileFileIntegrity" OR (eventMessage CONTAINS "Touch Typer") OR (eventMessage CONTAINS "io.kochie")' \
  > "$LOG" 2>&1 &
LOG_PID=$!
sleep 1
open "dist/mas-dev-arm64/Touch Typer.app"
sleep 4
kill $LOG_PID 2>/dev/null
grep -iE "reject|deny|invalid|amfi|signature|entitlement|profile|unsatisfied" "$LOG"
```

Common rejection patterns and what they mean:

| Log line | Root cause | Fix |
|---|---|---|
| `Provisioning Profile Validation: profile X is not provisioned for this device` + `Unsatisfied entitlements: com.apple.developer.team-identifier, com.apple.developer.aps-environment` | The profile was registered with the wrong device ID — usually Hardware UUID instead of Provisioning UDID | Re-register this Mac in the Portal with the correct Provisioning UDID from `system_profiler SPHardwareDataType \| grep "Provisioning UDID"`, regenerate the profile |
| `AMFI: code signature validation failed` + `restricted entitlements` mentions `application-groups` | App Groups capability missing from profile | Enable App Groups on the App ID in the Portal, regenerate profile |
| `AMFI: hook..execve() killing xpcproxy ... (must be at least ad-hoc signed)` | Code signature corrupted or nested bundles ad-hoc signed | Rebuild — `electron-builder.ts` config bug if it recurs |
| No AMFI errors but `taskgated` denial | Developer Mode disabled | `sudo DevToolsSecurity -enable` |
| `Operation not permitted` deleting `~/Library/Containers/io.kochie.touch-typer/` | macOS protects sandbox containers | Use Finder to delete (Cmd+Delete); container will be recreated on next launch |

The signature itself (`codesign --verify --deep --strict`) can report "valid
on disk" and the bundle can still fail launch — verify is structural, AMFI
adds policy on top. Trust the AMFI logs over the codesign output when
diagnosing launch failures.

#### Diagnosing **runtime** failures (app launches, then crashes)

If the bundle passes AMFI (you see helper processes spawn briefly) but the
app immediately throws an "Uncaught Exception" dialog, the problem is in
the packaged JavaScript itself, not the signing or sandboxing.

Common patterns:

| Error in dialog | Root cause | Fix |
|---|---|---|
| `SyntaxError: Cannot use import statement outside a module` at `main/index.js:N` | `main/index.js` was packaged in its raw TypeScript form (with `import` statements), not the esbuild CommonJS bundle. Usually a stale/aborted build left a corrupt artifact. | Rerun `pnpm build-electron && pnpm package:mac-mas-dev`. The output should start with `"use strict";` + esbuild preamble, not `import { ... } from "..."`. |
| `Cannot find module '<some-package>'` | A native or dynamic dep got dropped by electron-builder's deduplication during asar packing — see the "electron-builder 26 + pnpm deduplication hazard" note in `CLAUDE.md`. | Add the missing module as a **direct** prod dep in `package.json`. |
| `Failed to load module '<some-file>'` or `ENOENT: no such file` for a renderer asset | `renderer/out/` is stale or partially exported (Next.js export error suppressed by an earlier success) | Delete `renderer/.next renderer/out`, rerun `pnpm build-renderer`. |
| Renderer windows open but content is blank/white | Same as above, or CSP / `enable-sandbox` blocking dev-server-style URLs | Check Sentry main-process logs (`~/Library/Containers/io.kochie.touch-typer/Data/Library/Application Support/Touch Typer/logs/`) for renderer-side errors |
| `Error: listen EPERM: operation not permitted 127.0.0.1` (fires a few minutes after launch, not at startup) | Something in the main process is calling `Server.listen()`. App Sandbox grants `network.client` (outbound) but not `network.server` (inbound listen). The most common offender is `electron-updater`'s MacUpdater starting a local HTTP proxy to feed downloaded updates to Squirrel.Mac — it kicks in only when the periodic update check actually finds an update, which is why the error is delayed. | Gate all `autoUpdater.*` interaction on `!process.mas`. MAS apps receive updates through the App Store, not Squirrel, so electron-updater should be completely silent in MAS builds. See `electron-src/index.ts` for the existing guards. **Do not** add `com.apple.security.network.server` as a workaround — Apple review will reject MAS apps that claim it without a documented justification. |

To inspect what's actually packed in the asar (the most reliable way to
catch stale artifacts before launching):

```shell
npx asar list "dist/mas-dev-arm64/Touch Typer.app/Contents/Resources/app.asar" | head -20
npx asar extract-file \
  "dist/mas-dev-arm64/Touch Typer.app/Contents/Resources/app.asar" \
  main/index.js /tmp/check.js
head -3 /tmp/check.js   # should be "use strict";, not "import { ... }"
```

### Build Output Structure

After a successful build, you'll find:

```
dist/
├── mac-arm64/           # ARM64 app bundle
│   └── Touch Typer.app
├── mac/                 # x64 app bundle
│   └── Touch Typer.app
├── mac-universal/       # Universal app bundle
│   └── Touch Typer.app
├── mas-universal/       # MAS package (when built)
│   └── Touch Typer-*.pkg
├── Touch Typer-*.dmg    # DMG installer
└── Touch Typer-*.zip    # ZIP for auto-update
```

### Entitlements Files

The project includes several entitlement files for different build scenarios:

| File | Purpose |
|------|---------|
| `build/entitlements.mac.plist` | Standard macOS builds (non-MAS) |
| `build/entitlements.mas.plist` | MAS builds (sandboxed) |
| `build/entitlements.mas.inherit.plist` | MAS child processes |
| `build/entitlements.mas.loginhelper.plist` | MAS login helper |

Key entitlements enabled:
- `com.apple.security.cs.allow-jit` - Required for ARM64 Electron
- `com.apple.security.network.client` - Network access
- `aps-environment` - Push notifications (development)
- `com.apple.security.app-sandbox` - MAS sandbox (MAS only)

### Feature Limitations in Unsigned Builds

When running unsigned local builds, some features won't work due to macOS security requirements:

| Feature | Works in Unsigned Build? | Notes |
|---------|-------------------------|-------|
| Basic app functionality | Yes | |
| Local notifications | Yes | Uses Electron's `Notification` API |
| Push notifications (APNS) | No | Requires signed app + Apple entitlements |
| Auto-update | No | Requires notarized app |
| In-App Purchase | No | Requires MAS build |
| Hardened Runtime features | No | Requires code signing |
| Deep linking (`touchtyper://`) | Partial | Works but may conflict with installed signed app |

For full feature testing, use a signed development build:

```shell
# MAS development build (requires dev provisioning profile)
electron-builder build --mac mas-dev --publish never

# Or signed non-MAS build (requires Developer ID certificate)
electron-builder build --mac --publish never
# (without -c.mac.identity=null)
```

### Troubleshooting Checklist

If your build fails, verify:

- [ ] Xcode is installed and command line tools are set up
- [ ] `pnpm install` completed successfully
- [ ] `pnpm build` completed (check `main/` and `renderer/out/` exist)
- [ ] For signed builds: certificates are in Keychain Access
- [ ] For MAS: provisioning profile exists in `build/`
- [ ] Icon files exist in `build/` directory
- [ ] Node version is 18+ (`node --version`)
- [ ] No previous build artifacts causing issues (`pnpm clean`)

## Notification System (Windows, macOS, Linux)

For building and testing the notification system (APNS, WNS, and Linux cron) on each platform, see **[docs/NOTIFICATION_SYSTEM.md](docs/NOTIFICATION_SYSTEM.md)**.

## Local Supabase Development

### Starting Supabase Locally

```shell
supabase start
```

This will spin up a local Supabase instance with:
- **API**: http://127.0.0.1:54321
- **Studio**: http://127.0.0.1:54323
- **Database**: localhost:54322
- **Inbucket (email testing)**: http://127.0.0.1:54324

### Stopping Supabase

```shell
supabase stop
```

### Database Migrations

Migrations are located in `supabase/migrations/`. To apply migrations:

```shell
supabase db reset
```

To create a new migration:

```shell
supabase migration new <migration_name>
```

### Edge Functions

Edge functions are located in `supabase/functions/`. Available functions:

| Function | Description |
|----------|-------------|
| `challenges` | Manage user typing challenges |
| `delete-user` | Handle user account deletion |
| `goals` | Manage user goals (speed, accuracy, practice, etc.) |
| `leaderboards` | Leaderboard score management |
| `recommendations` | AI-powered typing recommendations |

To serve functions locally:

```shell
supabase functions serve
```

To deploy a function:

```shell
supabase functions deploy <function_name>
```

### Generating TypeScript Types

To regenerate TypeScript types from the database schema:

```shell
supabase gen types typescript --local > renderer/src/types/supabase.ts
```

### Database Schema

The database includes the following tables:

- **profiles** - User metadata linked to auth.users
- **settings** - User preferences (keyboard, language, theme, etc.)
- **results** - Typing test results with key press data
- **goals** - User goals with requirements
- **challenges** - User typing challenges
- **leaderboard_scores** - Public leaderboard entries
- **subscriptions** - Billing/subscription information

All tables have Row Level Security (RLS) enabled.

## Running the App

### Development Mode (Next.js only)

```shell
pnpm dev:next
```

### Development Mode (Electron)

```shell
pnpm dev
```

### Build

```shell
pnpm build
```

## Beta Builds on Branches

Beta installers can be built from the `beta` or `develop` branch (or any branch via manual run) without creating a tag. These builds are published as **GitHub pre-releases** and use the **beta** update channel so they do not replace the "Latest release."

- **Trigger**: Push to `beta` or `develop`, or **Actions → Beta Build → Run workflow** and choose a branch.
- **Version**: Set automatically to e.g. `2.1.0-beta.<run_number>`.
- **Store uploads**: Skipped by default; enable **Upload to App Store Connect / Windows Dev Center** in the manual workflow run when you want to push a specific build to TestFlight or the Windows Store.

See **[docs/BETA_BUILDS.md](docs/BETA_BUILDS.md)** for full details (versioning, pre-releases, update channel, and store uploads).

## Creating a Release

To create a beta version:

```shell
pnpm version prerelease --preid beta 
git push --tags
```

This will start the GH Action for releases and create a draft release with the tag.

## CI/CD Supabase Deployment

The `.github/workflows/supabase-deploy.yml` workflow automatically deploys Supabase changes on release. It:

1. Pushes database migrations to production
2. Deploys all edge functions

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token from [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_DB_PASSWORD` | Database password for the production project |
| `SUPABASE_PROJECT_ID` | Project reference ID (found in Project Settings > General) |

### Manual Deployment

You can also trigger the workflow manually from the Actions tab using `workflow_dispatch`.
