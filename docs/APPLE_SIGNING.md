# Apple Distribution & Signing

This document explains every certificate, profile, and entitlement involved in shipping Touch Typer on macOS, what each one is *for*, and how they fit together. It also includes a first-time setup checklist and a rotation procedure for when something expires.

Touch Typer ships two macOS variants from one codebase:

| Variant | electron-builder target | Where it goes | Signed with |
|---|---|---|---|
| **Mac App Store** | `mas` (universal `.pkg`) | App Store Connect | Apple Distribution (app) + 3rd Party Mac Developer Installer (pkg) |
| **Developer ID** | `default` (universal `.dmg` + `.zip`) | GitHub Releases / direct download | Developer ID Application (app) + Apple notarization |

These are completely separate signing pipelines that share zero artifacts. A change to one does not affect the other.

App ID: `io.kochie.touch-typer` · Team ID: `SJ9U6MWNZK`

---

## 1. The certificate zoo

Apple issues many certificate types; only a few apply here. Each cert lives in your **keychain** locally and as a `.cer` (public) + `.p12` (private key + cert bundle) when you need to ship it to CI.

| Certificate | Purpose | Used by Touch Typer? |
|---|---|---|
| **Apple Development** | Signs builds for local development on registered devices. | Yes — `masDev` target. |
| **Apple Distribution** | Modern unified distribution cert for iOS *and* macOS App Store. Supersedes "Mac App Distribution". | Yes — signs the `.app` for MAS. |
| **3rd Party Mac Developer Installer** | Signs the `.pkg` installer that wraps a MAS `.app`. Different cert from the one that signs the app inside it. | Yes — signs the `.pkg`. |
| **Developer ID Application** | Signs `.app` bundles for distribution outside the App Store. Required for Gatekeeper to allow the app to launch on macOS 10.15+. | Yes — `mac` (default) target. |
| **Developer ID Installer** | Signs `.pkg` installers distributed outside the App Store. Touch Typer ships `.dmg`/`.zip`, not `.pkg`, so this is unused. | No. |
| 3rd Party Mac Developer Application | *Legacy* MAS app cert, predecessor to Apple Distribution. Apple no longer issues these. | No. |
| Mac Installer Distribution | *Legacy* MAS installer cert. Apple now calls it 3rd Party Mac Developer Installer. | No. |

The two certificates that ship a MAS build (Apple Distribution + 3rd Party Mac Developer Installer) are a matched pair — you sign the inner `.app` with the first, then wrap it in a `.pkg` signed with the second. electron-builder does both steps automatically when targeting `mas`.

### Validity

- Apple Development certs expire after **1 year**.
- All distribution certs (Apple Distribution, Developer ID, 3rd Party) expire after **5 years**.
- A renewal is *not* an in-place update — it's a brand-new cert with a new fingerprint. Provisioning profiles that referenced the old cert keep referencing the old cert until you regenerate them.

---

## 2. Provisioning profiles

A provisioning profile (`.provisionprofile`) is a signed `.plist` issued by Apple that binds together:

- An **App ID** (e.g. `io.kochie.touch-typer`)
- A **list of certificates** authorized to sign this app (by fingerprint)
- A list of **entitlements** the app is allowed to claim
- For Development/Ad-Hoc profiles: a list of registered devices
- A **team ID** (`SJ9U6MWNZK`)

The profile is *embedded* inside the signed `.app` (as `Contents/embedded.provisionprofile`). At install time, macOS/MAS checks that the cert that signed the app matches one listed in the profile.

| Profile type | Purpose | Used by Touch Typer? |
|---|---|---|
| **Mac App Development** | Local dev runs of MAS-style builds (signed with Apple Development cert). Includes registered devices. | Yes — `masDev` target. |
| **Mac App Store Distribution** | Production MAS uploads. References Apple Distribution + 3rd Party Mac Developer Installer. | Yes — `mas` target. |
| **Direct Distribution** (a.k.a. "Developer ID Provisioning Profile") | Required for **Developer ID** builds that use push notifications, network extensions, or certain other capabilities. References the Developer ID Application cert. | Yes — `mac` (default) target. Touch Typer needs it because of APNS push. |

A profile is *not* a credential. It's a manifest. It carries no secret. You can commit it to a repo if you don't mind leaking your team ID + bundle ID + entitlement list (which are not secret anyway). The thing you must protect is the `.p12` for the corresponding **certificate**.

---

## 3. Entitlements

Entitlements are key/value pairs embedded into the signed app that declare which OS-level capabilities the app intends to use (sandbox, push, network, file access, keychain, etc.). They must match:

- The capabilities **enabled on the App ID** in the Developer Portal
- The capabilities listed in the **provisioning profile** for the app

A signed app with an entitlement not granted by its profile will be rejected at validation time. Conversely, requesting fewer entitlements than the profile grants is fine.

Touch Typer's entitlement files live in `build/`:

| File | Used by |
|---|---|
| `entitlements.mas.plist` | MAS main process (sandbox + APNS production) |
| `entitlements.mas.inherit.plist` | MAS child processes (inherits sandbox) |
| `entitlements.mas.loginhelper.plist` | MAS LoginItem helper (auto-launch on login) |
| `entitlements.mas-dev.*` plist | masDev equivalents (APNS sandbox) |
| `entitlements.mac.plist` | Developer ID main process (hardened runtime + APNS production) |
| `entitlements.mac.dev.plist` | Developer ID dev variant (currently unused; APNS sandbox + Apple Development cert) |
| `entitlements.mac.no-push.plist` | Developer ID build with no APNS capability |

The split between `mac.plist` and `mas.plist` is important: MAS apps **must** be sandboxed (`com.apple.security.app-sandbox = true`); Developer ID apps **must not** be sandboxed but **must** opt into hardened runtime. The two are mutually exclusive and need different entitlement files.

---

## 4. How they fit together for each target

### `--mac default` (Developer ID DMG/ZIP, e.g. beta channel)

1. `.app` is signed with **Developer ID Application** cert
2. Embeds the **Direct Distribution** provisioning profile (decoded from `secrets.mac_provisioning_profile` → `build/mac-touchtyper.provisionprofile`)
3. Entitlements: `build/entitlements.mac.plist` (hardened runtime + APS production)
4. Notarized via `xcrun notarytool` (electron-builder handles this when `mac.notarize: true`)
5. Stapled with `xcrun stapler` so it launches offline
6. Wrapped in `.dmg` and `.zip` for distribution

### `--mac mas` (Mac App Store `.pkg`)

1. `.app` is signed with **Apple Distribution** cert
2. Embeds the **Mac App Store Distribution** provisioning profile (decoded from `secrets.provisioning_profile` → `build/mas-touchtyper.provisionprofile`)
3. Entitlements: `build/entitlements.mas.plist` (sandbox + APS production)
4. Wrapped in `.pkg`, signed with **3rd Party Mac Developer Installer** cert
5. Validated + uploaded to App Store Connect via `xcrun altool`
6. **Not** notarized (App Store does its own review)

### `--mac mas-dev` (local MAS-style testing on registered devices)

Same as `mas`, but:
- Signed with **Apple Development** cert instead of Apple Distribution
- Embeds **Mac App Development** profile (decoded from `secrets.mac_provisioning_profile_dev` if used in CI; otherwise local profile at `build/mas-touchtyper-dev.provisionprofile`)
- Entitlements: `build/entitlements.mas-dev.plist` (APS sandbox)

---

## 5. GitHub secrets map

| Secret name | Contents | Used by which target |
|---|---|---|
| `mac_certs` | Base64-encoded `.p12` bundle containing **all** macOS distribution certs (Apple Distribution + 3rd Party Mac Developer Installer + Developer ID Application + their private keys) | All `--mac` targets (via electron-builder `CSC_LINK` → `MAC_LINK`) |
| `mac_certs_password` | Password for the `.p12` | All `--mac` targets |
| `provisioning_profile` | Base64-encoded **Mac App Store Distribution** profile | `mas` |
| `mac_provisioning_profile` | Base64-encoded **Direct Distribution** profile (Developer ID + APNS) | `default` |
| `mac_provisioning_profile_dev` | Base64-encoded **Mac App Development** profile (currently unused in beta; reserved) | `mas-dev` |
| `api_key` | Base64-encoded App Store Connect API key (`AuthKey_<id>.p8`) | Notarization + App Store upload |
| `api_key_id` | The 10-character API key ID | Notarization + App Store upload |
| `api_key_issuer_id` | The issuer UUID from App Store Connect → Keys | Notarization + App Store upload |

The workflow decodes secrets in the `Prepare for app notarization` step. The `.p12` ones are handed off to electron-builder as `MAC_LINK` / `MAC_KEY_PASSWORD` and imported into a temporary keychain at build time.

---

## 6. First-time setup checklist

Run through this once when bootstrapping a fresh signing pipeline. Each step is a separate failure point; don't skip them.

### Apple Developer Portal

- [ ] Enroll in the **Apple Developer Program** ($99/yr, individual or organization). Note the **Team ID** — you'll need it everywhere.
- [ ] **Create the App ID** at *Certificates, IDs & Profiles → Identifiers*:
  - Bundle ID: `io.kochie.touch-typer` (explicit, not wildcard)
  - Capabilities: enable everything the entitlements files claim (App Sandbox, Push Notifications, App Groups, Network Extensions if used). If you skip one here, the build will fail validation later with "Invalid Code Signing Entitlements".
- [ ] **Create an App Record** in App Store Connect → Apps → New App, using the same bundle ID. Without this the MAS upload returns "app not found".
- [ ] **Create signing certificates** at *Certificates, IDs & Profiles → Certificates*:
  - [ ] Apple Development (for `masDev`)
  - [ ] Apple Distribution (for `mas`)
  - [ ] 3rd Party Mac Developer Installer (for the MAS `.pkg`)
  - [ ] Developer ID Application (for `default`)
  - Each step: generate a CSR locally (Keychain Access → Certificate Assistant → Request from CA), upload to the portal, download the `.cer`, double-click to install in your login keychain.
- [ ] **Create provisioning profiles** at *Profiles*:
  - [ ] Mac App Store Distribution → bound to App ID `io.kochie.touch-typer` + Apple Distribution cert
  - [ ] Direct Distribution → bound to App ID + Developer ID Application cert, with APNS capability
  - [ ] (Optional) Mac App Development → bound to Apple Development cert + your registered devices
  - Download each `.provisionprofile`.
- [ ] **Create an App Store Connect API key** at *App Store Connect → Users and Access → Keys → Team Keys*:
  - Role: *Developer* (enough for upload + notarization) or *App Manager* (broader).
  - Download the `.p8` file (you get exactly one chance — save it).
  - Record the **Key ID** (10 chars) and **Issuer ID** (UUID).

### Local machine

- [ ] Confirm certs are present: `security find-identity -v -p codesigning` should list Apple Development, Apple Distribution, 3rd Party Mac Developer Installer, Developer ID Application.
- [ ] **Export the .p12 bundle**: in Keychain Access, select all four certs (with their private keys) → File → Export → `.p12` → set a password. Save the password — it goes into `mac_certs_password`.
- [ ] Verify the .p12: `security cms -D -i mac-touchtyper.provisionprofile | plutil -p -` should show your team ID and bundle ID.

### GitHub secrets

For each `.provisionprofile` and the `.p12` and the `.p8`:

```bash
base64 -i mac-certs.p12 | pbcopy        # paste into mac_certs
base64 -i AuthKey_ABC1234567.p8 | pbcopy # paste into api_key
base64 -i mas-touchtyper.provisionprofile | pbcopy        # paste into provisioning_profile
base64 -i mac-touchtyper.provisionprofile | pbcopy        # paste into mac_provisioning_profile
```

- [ ] `mac_certs` — base64 of the .p12
- [ ] `mac_certs_password` — the .p12 password
- [ ] `provisioning_profile` — base64 of the MAS profile
- [ ] `mac_provisioning_profile` — base64 of the Direct Distribution profile
- [ ] `api_key` — base64 of `AuthKey_<id>.p8`
- [ ] `api_key_id` — the 10-char key ID
- [ ] `api_key_issuer_id` — the issuer UUID

### First verification

- [ ] Trigger the Beta Build workflow with `upload_to_stores: false` first. Confirm the `Build/Release Electron app` step succeeds for `macos-26`.
- [ ] Then trigger it with `upload_to_stores: true`. Confirm the `Upload to App Store Connect` step actually validates and uploads — not just exits green (the workflow now greps altool output for failures).

---

## 7. Rotation / renewal

When a certificate expires (or you renew preemptively):

1. **Revoke or note the old cert** in the Developer Portal. (Revoking invalidates *all* profiles that reference it. You can keep the old cert active alongside the new one for a transition period.)
2. **Generate a new cert** (CSR → upload → download → install in keychain).
3. **Regenerate every provisioning profile** that referenced the old cert. This is the step people forget — a renewed cert does *not* automatically update the profiles. The profile must be edited and re-saved with the new cert selected.
4. **Re-export the .p12** with the new cert in the bundle, and update `mac_certs`. Either keep the old cert in the .p12 for a transition or remove it.
5. **Re-download every regenerated profile** and update `provisioning_profile` and `mac_provisioning_profile`.
6. Trigger a Beta Build and confirm validation passes.

API keys rotate independently — if you rotate the App Store Connect API key, only `api_key`, `api_key_id`, and `api_key_issuer_id` need to change. Certs/profiles are unaffected.

---

## 8. Verification commands

When something fails, these commands answer the most common questions before you start guessing.

```bash
# Which signing identities are in my keychain?
security find-identity -v -p codesigning

# What's inside a provisioning profile? (team ID, app ID, entitlements, cert fingerprints)
security cms -D -i build/mas-touchtyper.provisionprofile | plutil -p -

# Which cert signed this app, and which profile is embedded?
codesign -dvv "dist/mas-universal/Touch Typer.app"
security cms -D -i "dist/mas-universal/Touch Typer.app/Contents/embedded.provisionprofile" | plutil -p -

# Does the embedded profile reference the cert that actually signed the app?
# Compare the SHA-1 fingerprints:
codesign -dvvv "dist/mas-universal/Touch Typer.app" 2>&1 | grep "Authority\|TeamIdentifier\|Hash"
security cms -D -i "dist/mas-universal/Touch Typer.app/Contents/embedded.provisionprofile" | plutil -p - | grep -A1 DeveloperCertificates

# What entitlements does the signed app claim?
codesign -d --entitlements - --xml "dist/mas-universal/Touch Typer.app" | plutil -p -

# Validate the App Store Connect API key works:
xcrun altool --list-providers --apiKey "<key_id>" --apiIssuer "<issuer_id>"
```

---

## 9. Troubleshooting

### `Missing code-signing certificate.`

Apple's altool returns this when the cert that signed the `.app` is **not listed** in the embedded provisioning profile. Causes:

- The profile was generated against an old cert that's no longer in your `mac_certs` .p12 (or has been revoked/expired in the portal).
- The `mac_certs` .p12 was rotated to a new cert without regenerating the profile against that new cert.
- The .p12 contains multiple certs and electron-builder picked one not referenced in the profile.

Fix: regenerate the MAS provisioning profile in the Developer Portal against the **current** Apple Distribution cert, re-base64, update `secrets.provisioning_profile`, re-run.

### `Invalid Code Signing Entitlements.` / `entitlement not allowed`

The signed app claims an entitlement (e.g. `aps-environment`, `com.apple.developer.networking.networkextension`) that:

- Isn't enabled on the **App ID** in the portal, **or**
- Isn't included in the **provisioning profile** that's embedded

Fix: enable the capability on the App ID, regenerate the profile, update the secret.

### `No identity found` during electron-builder

The .p12 wasn't imported into the runner's keychain. Either `MAC_LINK` is empty/wrong (check the workflow `env:` block) or `MAC_KEY_PASSWORD` doesn't match. Run the workflow with `ACTIONS_STEP_DEBUG=true` enabled to see electron-builder's signing log.

### `The signature of the binary is invalid.` during notarization

Usually a sign of mid-build cert drift, or a universal binary where the two arch slices were signed with different certs. Re-run the build cleanly. If it persists, check the asar with `npx asar list` to confirm both arch builds contain identical contents (this project has bitten itself with that — see `electron-builder.ts` comments about `singleArchFiles`).

### CI is green but Apple never received the build

altool exits 0 even on validation failure. The workflow now greps for `VERIFY FAILED` / `UPLOAD FAILED` and fails the step — if you see this regress, check that the `Upload to App Store Connect` step still has the grep guards.

---

## 10. References

- Apple: [Certificates, identifiers, and profiles](https://developer.apple.com/help/account/manage-identifiers/register-an-app-id)
- Apple: [Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/Introduction/Introduction.html) (older but still authoritative)
- electron-builder: [Code Signing](https://www.electron.build/code-signing) and [mas configuration](https://www.electron.build/configuration/mas)
- `docs/BETA_BUILDS.md` — beta channel deployment from this project
- `docs/NOTIFICATION_SYSTEM.md` — APNS push specifics and how entitlements interact
- `DEVELOPMENT.md` — local build commands and env vars
