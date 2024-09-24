import { Configuration } from "electron-builder";

const PRE_RELEASE = process.env["PRE_RELEASE"];
const EDGE = process.env["EDGE"];
const RELEASE = process.env["RELEASE"];

const snapChannels: string[] = [];

if (RELEASE) {
  console.log("Building stable release");
  snapChannels.push("stable");
} else if (PRE_RELEASE) {
  console.log("Building beta release");
  snapChannels.push("beta");
} else {
  console.log("Building edge release");
  snapChannels.push("edge");
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
    // provisioningProfile: "build/mas-touchtyper.provisionprofile",
    category: "public.app-category.productivity",
    icon: "build/app-icon.icns",
    entitlements: "build/entitlements.mac.plist",
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
        channels: snapChannels,
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
    },
  ],
};

export default config;
