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
 * Check if we're building a MAS target (mas or mas-dev)
 * MAS builds should NOT be notarized - they go through App Store review instead
 */
function isMasBuild(): boolean {
  const args = process.argv.join(' ');
  const isMas = args.includes('mas-dev') || args.includes('mas ') || args.endsWith('mas');
  if (isMas) {
    console.log("Build target: MAS (App Store) - notarization will be skipped");
  }
  return isMas;
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
    hardenedRuntime: !buildingMas,
    notarize: notarizeConfig,
    // These are for CI/CD signing of non-MAS builds only
    cscLink: isCI ? process.env["MAC_LINK"] : undefined,
    cscKeyPassword: isCI ? process.env["MAC_KEY_PASSWORD"] : undefined,

    bundleVersion: process.env["BUNDLE_VERSION"],
    // remove beta from version 1.2.3-beta.4 -> 1.2.3.4
    bundleShortVersion: version.replace(/-beta\.\d+$/, ""),
    category: "public.app-category.productivity",
    icon: "build/icon.icon",
    entitlements: buildingMas ? undefined : (buildingDev ? "build/entitlements.mac.dev.plist" : "build/entitlements.mac.plist"),
    // Provisioning profile required for push notifications with Developer ID
    provisioningProfile: buildingMas ? undefined : (
      process.env["MAC_PROVISIONING_PROFILE"] || "build/mac-touchtyper.provisionprofile"
    ),
    extendInfo: {
      ITSAppUsesNonExemptEncryption: false
    },

    type: buildingDev ? "development" : "distribution",
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
    provisioningProfile: "build/mas-touchtyper.provisionprofile",
    entitlementsLoginHelper: "build/entitlements.mas.loginhelper.plist",
    entitlements: "build/entitlements.mas.plist",
    entitlementsInherit: "build/entitlements.mas.inherit.plist",
  },
  masDev: {
    notarize: false,
    // MAS builds use App Sandbox, not hardened runtime
    hardenedRuntime: false,
    // Explicitly specify identity to use "Apple Development" certificate
    // This overrides any auto-discovery and ensures correct certificate is used
    // identity: "Apple Development",
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
    // Use supported runtime (20.08 is EoL); required for CI flatpak build (Flathub remote)
    
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
  files: ["main", "renderer/out", "wordsets"],
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
