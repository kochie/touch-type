import { Configuration } from "electron-builder";
import { version } from "./package.json"

let channel = "stable";
if (process.env["GITHUB_REF"]?.includes("beta")) {
  channel = "beta";
}
if (process.env["GITHUB_REF"]?.includes("alpha")) {
  channel = "alpha";
}
if (process.env["CHANNEL"]) {
  channel = process.env["CHANNEL"];
}

/**
 * Check if we're building a MAS target (mas or mas-dev).
 * MAS builds should NOT be notarized — they go through App Store review instead.
 *
 * We exact-match against argv entries (excluding the node binary + electron-builder
 * script path at slice(0,2)) rather than substring-scanning a joined string. This
 * avoids a real CI footgun: if the checkout path or another argument incidentally
 * contains "mas-dev" or ends with "mas" (e.g. a runner directory named
 * "thomas-dev"), substring matching would false-positive and route a Developer ID
 * build through the MAS code paths, producing a broken bundle that altool rejects.
 *
 * electron-builder's --mac flag emits the target name as its own argv entry
 * (`--mac mas-dev` becomes ['--mac', 'mas-dev']), so an exact-equality check
 * over argv is both safer and unambiguous.
 */
function isMasBuild(): boolean {
  const targets = process.argv.slice(2);
  const isMas = targets.includes('mas-dev') || targets.includes('mas');
  if (isMas) {
    console.log("Build target: MAS (App Store) - notarization will be skipped");
  }
  return isMas;
}

/**
 * Check if we're building the MAS development target specifically.
 * Subset of isMasBuild() — routes the provisioning profile to the dev profile
 * during the intermediate "darwin sign" pass (see comment on mac.provisioningProfile).
 */
function isMasDevBuild(): boolean {
  return process.argv.slice(2).includes('mas-dev');
}

/**
 * Check if we're building a development version (for APNS development environment)
 * Set MAC_DEV=true to use development APNS entitlements
 */
function isDevBuild(): boolean {
  const isDev = process.env["MAC_DEV"] === "true";
  if (isDev) {
    console.log("Build mode: Development (using APNS development environment)");
  }
  return isDev;
}

function isCIBuild(): boolean {
  return process.env["CI"] === "true";
}

/**
 * Determine notarization settings based on available credentials
 *
 * Notarization applies only to the mac "default" target (dmg/dir). electron-builder
 * skips notarization for the MAS target automatically, so we enable it whenever
 * credentials are present when building --mac default (with or without --mac mas).
 *
 * For notarization to work, you need EITHER:
 * 1. Apple API Key (recommended):
 *    - APPLE_API_KEY: path to .p8 file
 *    - APPLE_API_KEY_ID: key ID from App Store Connect
 *    - APPLE_API_ISSUER: issuer ID from App Store Connect
 *
 * 2. Legacy Apple ID method:
 *    - APPLE_ID: your Apple ID email
 *    - APPLE_APP_SPECIFIC_PASSWORD: app-specific password
 *    - APPLE_TEAM_ID: your team ID
 *
 * If neither is set, notarization is disabled for local development.
 */
function shouldNotarize(): boolean {
  if (isDevBuild()) {
    console.log("Notarization: Disabled (development build, doesn't need notarization)");
    return false;
  }

  const hasApiKey = process.env["APPLE_API_KEY"] && 
                    process.env["APPLE_API_KEY_ID"] && 
                    process.env["APPLE_API_ISSUER"];
  
  const hasLegacyCredentials = process.env["APPLE_ID"] && 
                               process.env["APPLE_APP_SPECIFIC_PASSWORD"] &&
                               process.env["APPLE_TEAM_ID"];

  if (hasApiKey) {
    console.log("Notarization: Enabled (using Apple API Key credentials)");
    return true;
  }
  
  if (hasLegacyCredentials) {
    console.log("Notarization: Enabled (using legacy Apple ID credentials)");
    return true;
  }
  
  console.log("Notarization: Disabled (no credentials found)");
  console.log("  To enable, set APPLE_API_KEY, APPLE_API_KEY_ID, and APPLE_API_ISSUER");
  console.log("  Or set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID");
  return false;
}

const notarizeConfig = shouldNotarize();
const buildingMas = isMasBuild();
const buildingMasDev = isMasDevBuild();
const buildingDev = isDevBuild();
const isCI = isCIBuild();

const config: Configuration = {
  appId: "io.kochie.touch-typer",
  copyright: "Copyright © 2022 Robert Koch",
  npmRebuild: true,
  generateUpdatesFilesForAllChannels: true,
  // Register custom URL protocol for deep linking
  protocols: [
    {
      name: "Touch Typer",
      schemes: ["touchtyper"],
      role: "Viewer",
    },
  ],
  mac: {
    gatekeeperAssess: false,
    hardenedRuntime: true,
    notarize: notarizeConfig,
    // These are for CI/CD signing of non-MAS builds only
    cscLink: isCI ? process.env["MAC_LINK"] : undefined,
    cscKeyPassword: isCI ? process.env["MAC_KEY_PASSWORD"] : undefined,
    // electron-builder signs MAS bundles in two passes: an intermediate
    // "darwin sign" pass that uses this top-level `mac` config to sign all
    // nested helper apps and Frameworks, then a final pass that uses the
    // `mas`/`masDev` config to re-sign only the outer .app. If `mac.identity`
    // is left undefined for a mas-dev build, the intermediate pass falls back
    // to ad-hoc (because `package:mac-mas-dev` sets CSC_IDENTITY_AUTO_DISCOVERY=false
    // to keep it from auto-picking the Developer ID cert). The result is
    // outer-sig=Apple Development + inner-sigs=ad-hoc, which fails launch with
    // RBSRequestErrorDomain code 5 / launchd error 163. Pinning the identity
    // here ensures both passes use the same Apple Development cert.
    identity: buildingMasDev ? "Apple Development" : undefined,

    bundleVersion: process.env["BUNDLE_VERSION"],
    // remove beta from version 1.2.3-beta.4 -> 1.2.3.4
    bundleShortVersion: version.replace(/-beta\.\d+$/, ""),
    category: "public.app-category.productivity",
    icon: "build/icon.icon",
    // Developer ID (DMG) builds always use production APS — sandbox APS requires
    // an Apple Development cert + registered devices and cannot be used with
    // freely-distributed Developer ID builds. Beta vs stable APNS routing is
    // handled server-side. MAC_DEV=true local builds use a Development cert
    // and can use sandbox APS via the dev entitlements.
    // mas/masDev configs override this for App Store targets.
    entitlements: buildingDev
      ? "build/entitlements.mac.dev.plist"
      : "build/entitlements.mac.plist",
    // Provisioning profile required for push notifications with Developer ID.
    // When building MAS, electron-builder runs an intermediate "darwin sign"
    // pass on the universal MAS bundle that uses this top-level `mac` config
    // BEFORE the final `mas` resign. That intermediate pass copies whatever
    // file this points at into Contents/embedded.provisionprofile, and the
    // final MAS sign does NOT replace that file (codesign --force replaces
    // only the code signature, not embedded.provisionprofile). So when
    // building MAS, this MUST point at the MAS profile too — otherwise the
    // MAS .pkg ships with the Developer ID profile embedded and altool
    // rejects with "Missing code-signing certificate".
    provisioningProfile:
      process.env["MAC_PROVISIONING_PROFILE"]
      || (buildingMasDev
            ? "build/mas-touchtyper-dev.provisionprofile"
            : buildingMas
              ? "build/mas-touchtyper-prod.provisionprofile"
              : buildingDev
                ? "build/mac-touchtyper-dev.provisionprofile"
                : "build/mac-touchtyper-prod.provisionprofile"),
    extendInfo: {
      ITSAppUsesNonExemptEncryption: false
    },

    type: buildingDev ? "development" : "distribution",
    // Pure-JS packages from @sentry/electron's OpenTelemetry stack (acorn,
    // import-in-the-middle, etc.) end up in one arch asar but not the other
    // because @electron/rebuild runs twice and pnpm re-resolves optional deps
    // differently each pass. They are safe to be arch-unique since they are
    // pure JS and work on both architectures regardless.
    singleArchFiles: "node_modules/**",
    // NOTE: Targets are specified via CLI, not hardcoded here.
    // Build commands:
    //   Local unsigned:     electron-builder build --mac -c.mac.identity=null
    //   Local mas-dev:      electron-builder build --mac mas-dev
    //   CI all targets:     electron-builder build --mac default --mac mas
  },
  mas: {
    notarize: false,
    // MAS builds use App Sandbox, not hardened runtime
    hardenedRuntime: false,
    // Explicitly specify identity to use App Store distribution certificate
    // identity: "3rd Party Mac Developer Application",
    provisioningProfile: "build/mas-touchtyper-prod.provisionprofile",
    entitlementsLoginHelper: "build/entitlements.mas.loginhelper.plist",
    entitlements: "build/entitlements.mas.plist",
    entitlementsInherit: "build/entitlements.mas.inherit.plist",
  },
  masDev: {
    notarize: false,
    // MAS builds use App Sandbox, not hardened runtime
    hardenedRuntime: false,
    // Prefix-match against any "Apple Development:" cert in the user's
    // keychain. Required because the `package:mac-mas-dev` script sets
    // CSC_IDENTITY_AUTO_DISCOVERY=false to prevent picking the Developer ID
    // cert — without an explicit identity, electron-osx-sign falls back to
    // ad-hoc signing and the resulting build won't launch. CI bypasses this
    // by injecting CSC_LINK (a temp keychain), which provides its own identity.
    identity: "Apple Development",
    provisioningProfile: "build/mas-touchtyper-dev.provisionprofile",
    entitlementsLoginHelper: "build/entitlements.mas-dev.loginhelper.plist",
    entitlements: "build/entitlements.mas-dev.plist",
    entitlementsInherit: "build/entitlements.mas-dev.inherit.plist",
  },
  appx: {
    identityName: "15825koch.ie.TouchTyper",
    publisherDisplayName: "koch.ie",
    publisher: "CN=A4E63F97-D38A-4C9B-87AF-705E061DD638",
    applicationId: "koch.ie.TouchTyper",
  },
  linux: {
    icon: "build/app-logo-linux.png",
    category: "Utility",
    mimeTypes: ["x-scheme-handler/touchtyper"],
    target: ["snap", "AppImage", "flatpak"],
  },
  snap: {
    // The "default" entry retains electron-builder's stock stage-packages
    // list (libnss3, libxss1, libgtk-3-0, etc.) — without it we'd replace
    // the whole list and lose those.
    //
    // Mesa packages added because the gnome-platform content snap that
    // electron-builder targets ships DRI drivers for amd64 but not
    // aarch64; bundling them inline lets arm64 snap installs render with
    // hardware acceleration. Adds ~30MB to the snap which is noise
    // relative to its existing ~200MB Electron footprint.
    stagePackages: [
      "default",
      "libgl1-mesa-dri",
      "libegl1-mesa",
      "libgles2-mesa",
    ],
  },
  flatpak: {
    runtimeVersion: "25.08",
    baseVersion: "25.08",
  },
  win: {
    icon: "build/app-logo-win.png",
    target: [
      {
        target: "nsis",
      },
      {
        target: "appx",
      },
    ],
  },

  nsis: {
    oneClick: false,
  },
  asar: true,
  files: [
    "main",
    "renderer/out",
    "wordsets",
    "codesnippets",
    // pg-int8 has a native C++ binding that compiles for x64 but fails for
    // arm64, causing a mach-o count mismatch when merging universal binaries.
    // Safe to drop: pg-types only uses it as a BigInt fallback, and Electron
    // 42 has native BigInt. Pure-JS arch divergences (postgres-array etc.)
    // are handled by singleArchFiles above.
    "!**/node_modules/pg-int8/**",
  ],
  // Mac and Windows use this; Linux uses linux.publish (GitHub + snapStore + flatpak build only)
  publish: [
    {
      provider: "github",
      owner: "kochie",
      repo: "touch-type",
      channel,
      releaseType: channel === "beta" || channel === "alpha" ? "prerelease" : "release",
    },
  ],
};

export default config;
