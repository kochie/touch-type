# Release Process

This document describes the complete release process for Touch Typer, including versioning, building, and publishing to all distribution channels.

## Overview

Touch Typer is distributed across multiple platforms and stores:

| Platform | Distribution Channel | Build Target |
|----------|---------------------|--------------|
| macOS | GitHub Releases, Mac App Store | `dmg`, `zip`, `mas` (pkg) |
| Windows | GitHub Releases, Microsoft Store | `nsis`, `appx` |
| Linux | GitHub Releases, Snap Store | `AppImage`, `deb`, `snap` |

## Release Channels

The app supports multiple release channels:

| Channel | Audience | Version Pattern |
|---------|----------|-----------------|
| `stable` | Production users | `v1.2.3` |
| `beta` | Beta testers | `v1.2.3-beta.1` |
| `alpha` | Internal testing | `v1.2.3-alpha.1` |
| `canary` | Bleeding edge | `v1.2.3-canary.1` |

## Prerequisites

Before creating a release, ensure you have:

- [ ] Node.js 18+ installed
- [ ] pnpm installed
- [ ] Access to GitHub repository with push permissions
- [ ] All required secrets configured in GitHub (see [Required Secrets](#required-secrets))

## Creating a Release

### 1. Update Version Number

For a **stable release**:
```shell
pnpm version patch   # 2.1.0 → 2.1.1
pnpm version minor   # 2.1.0 → 2.2.0
pnpm version major   # 2.1.0 → 3.0.0
```

For a **beta release**:
```shell
pnpm version prerelease --preid beta   # 2.1.0 → 2.1.1-beta.0
```

For an **alpha release**:
```shell
pnpm version prerelease --preid alpha  # 2.1.0 → 2.1.1-alpha.0
```

### 2. Push the Tag

```shell
git push origin main --tags
```

This triggers the GitHub Actions workflow that:
1. Creates a draft GitHub release with auto-generated release notes
2. Builds the app for all platforms (macOS, Windows, Linux)
3. Signs and notarizes the macOS builds
4. Uploads builds to GitHub Releases
5. Submits to Mac App Store
6. Submits to Microsoft Store
7. Publishes to Snap Store
8. Deploys Supabase migrations and edge functions

### 3. Finalize the Release

1. Navigate to [GitHub Releases](https://github.com/kochie/touch-type/releases)
2. Find the draft release created by the workflow
3. Review and edit the release notes if needed
4. Publish the release (or keep as pre-release for beta/alpha)

## Manual Release Trigger

You can also trigger a release manually from the GitHub Actions UI:

1. Go to **Actions** → **Building Release**
2. Click **Run workflow**
3. Select options:
   - **release**: Whether to publish the release
   - **channel**: Target release channel (`edge`, `beta`, `alpha`, `stable`)

## Build Process

### Local Build

```shell
# Clean previous builds
pnpm clean

# Build renderer (Next.js) and electron main process
pnpm build

# Create distribution packages (all platforms)
pnpm dist

# Create distribution for current platform only
pnpm pack-app
```

### Build Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Build Process                         │
├─────────────────────────────────────────────────────────────┤
│  1. Next.js Build (renderer)                                │
│     └── pnpm build-renderer                                 │
│         └── Outputs to: renderer/out/                       │
│                                                             │
│  2. Electron Build (main process)                           │
│     └── pnpm build-electron (esbuild)                       │
│         └── Outputs to: main/                               │
│                                                             │
│  3. Electron Builder                                        │
│     └── pnpm build+release                                  │
│         └── Outputs to: dist/                               │
│             ├── mac-universal/                              │
│             ├── mas-universal/                              │
│             ├── win-unpacked/                               │
│             └── linux-unpacked/                             │
└─────────────────────────────────────────────────────────────┘
```

## Platform-Specific Details

### macOS

**Build Targets:**
- `default` (dmg, zip) - For GitHub Releases
- `mas` (pkg) - For Mac App Store

**Code Signing & Notarization:**
- Uses hardened runtime for non-MAS builds
- Automatically notarized via Apple Notary API
- Requires valid Developer ID certificate

**Entitlements:**
- Network access for API calls
- JIT compilation (for V8)
- Unsigned executable memory
- DYLD environment variables

**App Store Submission:**
- Automatically validated and uploaded via `xcrun altool`
- Uses separate provisioning profile for MAS

### Windows

**Build Targets:**
- `nsis` - Traditional Windows installer
- `appx` - Microsoft Store package

**Microsoft Store Submission:**
- Uses StoreBroker PowerShell module
- Configured via `build/store_broker/SBConfig.json`
- Automatic submission on tag push

### Linux

**Build Targets:**
- `AppImage` - Universal Linux package
- `deb` - Debian/Ubuntu package
- `snap` - Snap package

**Snap Store:**
- Published to configured channel (stable/beta/alpha)
- Automatic publish on release

## CI/CD Pipeline

### Workflow: `tag_push.yml`

Triggered on:
- Push of version tags (`v*.*.*`, `v*.*.*-beta.*`, etc.)
- Manual workflow dispatch

Jobs:
1. **make_release** - Creates draft GitHub release
2. **build** - Builds for macOS, Windows, Linux (parallel)

### Workflow: `supabase-deploy.yml`

Triggered on:
- Push of version tags
- Manual workflow dispatch

Actions:
- Deploys database migrations
- Deploys edge functions

### Workflow: `release.yml`

Triggered on:
- GitHub release publication

Actions:
- Creates Sentry release for error tracking

## Required Secrets

Configure these in GitHub repository settings → Secrets:

### Apple (macOS)

| Secret | Description |
|--------|-------------|
| `mac_certs` | Base64-encoded .p12 certificate file |
| `mac_certs_password` | Password for the .p12 certificate |
| `api_key` | Base64-encoded Apple API key (.p8 file) |
| `api_key_id` | Apple API Key ID (e.g., `4R59VBAA4R`) |
| `api_key_issuer_id` | Apple API Issuer ID |
| `provisioning_profile` | Base64-encoded provisioning profile for MAS |

### Microsoft (Windows)

| Secret | Description |
|--------|-------------|
| `windows_dev_center_username` | Microsoft Partner Center username |
| `windows_dev_center_password` | Microsoft Partner Center password |
| `windows_dev_center_tenant_id` | Azure AD Tenant ID |

### Linux (Snap Store)

| Secret | Description |
|--------|-------------|
| `snapcraft_token` | Snapcraft store credentials |

### Supabase

| Secret | Description |
|--------|-------------|
| `SUPABASE_ACCESS_TOKEN` | Personal access token |
| `SUPABASE_DB_PASSWORD` | Database password |
| `SUPABASE_PROJECT_ID` | Project reference ID |

### Other Services

| Secret | Description |
|--------|-------------|
| `SENTRY_AUTH_TOKEN` | Sentry authentication token |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project name |
| `FONTAWESOME_NPM_AUTH_TOKEN` | FontAwesome Pro npm token |

## Version Numbering

The version in `package.json` follows semantic versioning with optional pre-release identifiers:

```
MAJOR.MINOR.PATCH[-PRERELEASE.N]
```

Examples:
- `2.1.0` - Stable release
- `2.1.0-beta.11` - 11th beta of version 2.1.0
- `2.1.0-alpha.3` - 3rd alpha of version 2.1.0

**Bundle Version** (macOS): Uses GitHub Actions run number for unique build identification.

## Post-Release Checklist

After a release is published:

- [ ] Verify GitHub release assets are uploaded
- [ ] Check Mac App Store Connect for build processing status
- [ ] Verify Microsoft Store submission status in Partner Center
- [ ] Confirm Snap Store publication
- [ ] Monitor Sentry for new errors
- [ ] Update any external documentation if needed

## Rollback Procedure

If a release has critical issues:

1. **GitHub Releases**: Delete or mark as pre-release
2. **Mac App Store**: Remove from sale in App Store Connect
3. **Microsoft Store**: Unpublish or submit previous version
4. **Snap Store**: Close the channel or revert to previous revision

## Troubleshooting

### Build Failures

**macOS Notarization Failed:**
- Verify Apple API key is valid and not expired
- Check entitlements are correct
- Ensure hardened runtime is enabled

**Windows APPX Signing Failed:**
- Verify publisher identity matches certificate
- Check that identity name is correctly configured

**Snap Build Failed:**
- Ensure snapcraft.yaml is valid
- Check base image compatibility

### Store Submission Failures

**Mac App Store:**
- Use `xcrun altool --validate-app` locally to check for issues
- Review App Store Connect for rejection reasons

**Microsoft Store:**
- Check StoreBroker logs for API errors
- Verify PDP.xml is valid
- Ensure screenshots meet requirements

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development setup
- [electron-builder.config.ts](./electron-builder.config.ts) - Build configuration
- [Supabase Functions](./supabase/functions/) - Edge function deployment
