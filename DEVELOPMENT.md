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
| `BUNDLE_VERSION` | Build number (usually CI run number) | App Store builds |

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

# MAS development build (requires dev provisioning profile in build/)
dotenv -e build/.env -- pnpm package:mac-mas-dev

# Full signed release build - all platforms (CI)
pnpm build+release

# macOS release with both targets: default + MAS (CI)
pnpm build+release:mac
```

**Important**: Targets are now specified via CLI, not hardcoded in the config.
This prevents double-signing when building a single target.

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

To test Mac App Store builds locally (requires Apple Developer account):

1. Create a development provisioning profile in Apple Developer Portal
2. Download and save as `build/mas-touchtyper-dev.provisionprofile`
3. Install your development certificate in Keychain
4. Run:

```shell
electron-builder build --mac mas-dev --publish never
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
