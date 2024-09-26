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

const config: Configuration = {
  appId: "io.kochie.touch-typer",
  copyright: "Copyright © 2022 Robert Koch",
  generateUpdatesFilesForAllChannels: true,
  mac: {
    gatekeeperAssess: false,
    hardenedRuntime: true,
    notarize: true,
    cscLink: process.env["MAC_LINK"],
    cscKeyPassword: process.env["MAC_KEY_PASSWORD"],
    bundleVersion: process.env["BUNDLE_VERSION"],
    // remove beta from version 1.2.3-beta.4 -> 1.2.3.4
    bundleShortVersion: version.replace(/-beta\.\d+$/, ""),
    // provisioningProfile: "build/mas-touchtyper.provisionprofile",
    category: "public.app-category.productivity",
    icon: "build/app-icon.icns",
    entitlements: "build/entitlements.mac.plist",
    extendInfo: {
      ITSAppUsesNonExemptEncryption: false
    },
    target: [
      {
        target: "default",
        arch: ["universal"],
      },
      {
        target: "mas",
        arch: ["universal"],
      },
    ],
  },
  mas: {
    hardenedRuntime: false,
    provisioningProfile: "build/mas-touchtyper.provisionprofile",
    entitlementsLoginHelper: "build/entitlements.mas.loginhelper.plist",
    entitlements: "build/entitlements.mas.plist",
    entitlementsInherit: "build/entitlements.mas.inherit.plist",
  },
  masDev: {
    hardenedRuntime: false,
    provisioningProfile: "build/mas-touchtyper-dev.provisionprofile",
    entitlementsLoginHelper: "build/entitlements.mas.loginhelper.plist",
    entitlements: "build/entitlements.mas.plist",
    entitlementsInherit: "build/entitlements.mas.inherit.plist",
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
  snap: {
    publish: [
      {
        provider: "snapStore",
        repo: "touch-typer",
        channels: [channel],
        publishAutoUpdate: true,
      },
    ],
  },
  nsis: {
    oneClick: false,
  },
  asar: true,
  files: ["main", "renderer/out", "wordsets"],
  publish: [
    {
      provider: "github",
      owner: "kochie",
      repo: "touch-type",
    }
  ],
};

export default config;
