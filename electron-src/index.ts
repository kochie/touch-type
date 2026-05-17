// Native
import { join } from "node:path";

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
  MessageBoxOptions,
  nativeTheme,
  shell,
} from "electron";
// import isDev from "electron-is-dev";
// import isDev from 'electron-is-dev';
import prepareNext from "./electron-next";
import {autoUpdater} from 'electron-updater';

import log from "electron-log";
import { init } from "@sentry/electron/main";
import { metrics } from "./metrics";
import { readFile } from "fs/promises";
import serve from "electron-serve";

import { setupInAppPurchase, getProducts } from "./in-app-purchase";

// Deep linking, notifications, and tray support
import { setupDeepLinkHandlers, setMainWindow, handleInitialDeepLink, launchedWithDeepLink } from "./deep-link";
import { setupNotificationScheduler } from "./notification-scheduler";
import { setupTray, setIsQuitting } from "./tray";
import { setupStartupHandlers, shouldStartMinimized } from "./startup";

// import { fileURLToPath } from "node:url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

init({
  dsn: "https://b91033c73a0f46a287bfaa7959809d12@o157203.ingest.sentry.io/6633710",
});

autoUpdater.logger = log;
// @ts-ignore
autoUpdater.logger.transports.file.level = "info";
log.info("App starting...");

// Setup deep link handlers before app is ready
// This returns false if another instance is running
const shouldContinue = setupDeepLinkHandlers();
if (!shouldContinue) {
  // Another instance is already running, quit this one
  process.exit(0);
}

async function handleWordSet(_event: IpcMainInvokeEvent, language: string) {
  try {
    const file = await readFile(
      join(__dirname, "../wordsets/", `${language}.txt`),
    );
    return file;
  } catch (error) {
    return new Uint8Array();
  }
}

async function handleGetCodeSnippets(_event: IpcMainInvokeEvent, lang: string) {
  try {
    return await readFile(join(__dirname, "../codesnippets/", `${lang}.txt`));
  } catch (error) {
    log.error(`Error loading code snippets for lang="${lang}":`, error);
    return null;
  }
}

async function handleLoadUserCodeFile(_event: IpcMainInvokeEvent, filePath: string) {
  try {
    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    log.error("Error loading user code file:", error);
    return null;
  }
}

async function handleShowOpenDialog() {
  try {
    return await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Code Files", extensions: ["c", "h", "py", "js", "ts", "txt", "cpp", "hpp", "java", "go", "rs"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
  } catch (error) {
    log.error("Error showing open dialog:", error);
    throw error;
  }
}

const loadURL = serve({ directory: "renderer/out" });

const appStartTime = Date.now();

// Prepare the renderer once the app is ready
// Store isDev status globally after import
let isDevMode = false;
let isMasDevMode = false;

/**
 * Detect a Mac App Development-signed build (i.e. `electron-builder --mac mas-dev`)
 * by reading the embedded provisioning profile. `process.mas` is true for BOTH
 * mas and mas-dev builds, so we can't use it to distinguish.
 *
 * The marker we use is `com.apple.developer.aps-environment = "development"`
 * (versus "production" on App Store profiles). Apple's dev provisioning profiles
 * always set this to "development" for the APNs sandbox; production profiles
 * set it to "production". This is a more reliable signal than get-task-allow:
 * profiles don't enumerate get-task-allow in their Entitlements dict (Apple
 * gates that one specially), but aps-environment is always there.
 *
 * Runs once at app start; the result feeds isMasDev() / getDebugInfo() to
 * conditionally surface developer tooling in the renderer.
 */
function detectMasDev(): boolean {
  if (!process.mas) return false;
  try {
    const { spawnSync } = require("child_process") as typeof import("child_process");
    const path = require("path") as typeof import("path");
    // process.resourcesPath -> .app/Contents/Resources; the profile lives one
    // directory up at .app/Contents/embedded.provisionprofile.
    const ppPath = path.join(path.dirname(process.resourcesPath), "embedded.provisionprofile");
    const result = spawnSync("security", ["cms", "-D", "-i", ppPath], { encoding: "utf8" });
    if (result.status !== 0) return false;
    return /<key>\s*com\.apple\.developer\.aps-environment\s*<\/key>\s*<string>\s*development\s*<\/string>/.test(
      result.stdout,
    );
  } catch {
    return false;
  }
}

app.on("ready", async () => {
  // Import isDev at app ready to avoid issues
  const isDev = await import("electron-is-dev");
  isDevMode = isDev.default;
  isMasDevMode = detectMasDev();
  log.info("Build flavor:", { isDevMode, isMas: !!process.mas, isMasDevMode });

  // Setup in-app purchase listener (macOS/MAS only; no-ops on other platforms)
  setupInAppPurchase();

  ipcMain.handle("getWordSet", handleWordSet);
  ipcMain.handle("getProducts", getProducts);
  // Renderer reads this synchronously at app mount to decide whether to
  // open startup modals (WHATS_NEW, etc). If we were launched with a
  // touchtyper:// arg, we don't want a modal obscuring the destination
  // page when the deep-link IPC arrives a few ms later.
  ipcMain.handle("launchedWithDeepLink", () => launchedWithDeepLink());
  ipcMain.handle("isMas", () => {
    // Dev-only override: `IS_MAS=true pnpm dev` forces isMas=true so the
    // renderer renders MAS-specific UI (IAP upgrade button, "Manage in
    // App Store" link, AI nav gating) without packaging an actual mas-dev
    // .app. Ignored in production — a Developer ID build can't be tricked
    // into invoking StoreKit code paths that aren't linked in.
    if (isDevMode && process.env["IS_MAS"] === "true") return true;
    return !!process.mas;
  });

  // MAS in-app purchase product IDs. Must match the identifiers in App
  // Store Connect verbatim — they get passed straight to
  // inAppPurchase.purchaseProduct().
  const FREEZE_PRODUCT_IDS = new Set([
    'streak_freeze_x1',
    'streak_freeze_x3',
    'streak_freeze_x10',
  ]);
  const SUBSCRIPTION_PRODUCT_IDS = new Set([
    'premium_monthly',
    'premium_yearly',
  ]);

  ipcMain.handle("purchaseStreakFreeze", async (_event: IpcMainInvokeEvent, productId: string) => {
    log.info(`[IAP] purchaseStreakFreeze called: productId=${productId}`);
    if (!FREEZE_PRODUCT_IDS.has(productId)) {
      log.warn(`[IAP] purchaseStreakFreeze: invalid product ID ${productId}`);
      return { queued: false, error: 'Invalid product ID' };
    }
    const { inAppPurchase } = await import('electron');
    if (!inAppPurchase.canMakePayments()) {
      log.error(`[IAP] purchaseStreakFreeze: canMakePayments=false`);
      return { queued: false, error: 'Payments not available' };
    }
    const isValid = await inAppPurchase.purchaseProduct(productId, 1);
    log.info(`[IAP] purchaseStreakFreeze: purchaseProduct returned ${isValid}`);
    return { queued: isValid, error: isValid ? undefined : 'StoreKit refused to queue the purchase. Most common cause in sandbox: no Sandbox Apple ID signed in (System Settings → Apple Account → Media & Purchases → Sandbox Account).' };
  });

  // Premium subscription purchase. StoreKit handles the user-facing flow
  // (auth, confirmation, payment). The transaction comes back through the
  // `transactions-updated` listener in in-app-purchase.ts, which forwards
  // it to the renderer for backend registration via map-transaction.
  ipcMain.handle("purchaseSubscription", async (_event: IpcMainInvokeEvent, productId: string) => {
    log.info(`[IAP] purchaseSubscription called: productId=${productId}`);
    if (!SUBSCRIPTION_PRODUCT_IDS.has(productId)) {
      log.warn(`[IAP] purchaseSubscription: invalid product ID ${productId}`);
      return { queued: false, error: 'Invalid product ID' };
    }
    const { inAppPurchase } = await import('electron');
    if (!inAppPurchase.canMakePayments()) {
      log.error(`[IAP] purchaseSubscription: canMakePayments=false`);
      return { queued: false, error: 'Payments not available' };
    }
    const isValid = await inAppPurchase.purchaseProduct(productId, 1);
    log.info(`[IAP] purchaseSubscription: purchaseProduct returned ${isValid}`);
    return { queued: isValid, error: isValid ? undefined : 'StoreKit refused to queue the purchase. Most common cause in sandbox: no Sandbox Apple ID signed in (System Settings → Apple Account → Media & Purchases → Sandbox Account).' };
  });

  // Restore Purchases — required by App Store review for any IAP UI.
  // Triggers StoreKit to re-deliver every active transaction for the
  // signed-in Apple ID via the `transactions-updated` listener with
  // state='restored'. Each one is then routed through the same
  // map-transaction path as a fresh purchase.
  ipcMain.handle("restorePurchases", async () => {
    const { inAppPurchase } = await import('electron');
    if (!inAppPurchase.canMakePayments()) {
      return { restored: false, error: 'Payments not available' };
    }
    // Electron's restoreCompletedTransactions doesn't return a count;
    // the renderer just waits for transactions-updated events.
    inAppPurchase.restoreCompletedTransactions();
    return { restored: true };
  });

  // Called by the renderer once map-transaction has confirmed the
  // transaction is registered server-side. Only then is it safe to finish
  // — otherwise a crash between StoreKit purchase and backend registration
  // would orphan the receipt.
  ipcMain.handle("finishIapTransaction", async (_event: IpcMainInvokeEvent, transactionDate: string) => {
    const { inAppPurchase } = await import('electron');
    inAppPurchase.finishTransactionByDate(transactionDate);
    return { finished: true };
  });
  
  // Code mode IPC handlers
  ipcMain.handle("getCodeSnippets", handleGetCodeSnippets);
  ipcMain.handle("loadUserCodeFile", handleLoadUserCodeFile);
  ipcMain.handle("showOpenDialog", handleShowOpenDialog);

  // Drives native chrome (titlebar, vibrancy, mica) to match the user's
  // in-app theme choice. Without this, the window frame stays in the macOS
  // system appearance even when the renderer is in manual dark/light mode.
  ipcMain.handle(
    "setThemeSource",
    (_event: IpcMainInvokeEvent, source: "system" | "light" | "dark") => {
      if (source === "system" || source === "light" || source === "dark") {
        nativeTheme.themeSource = source;
      }
    },
  );

  // Debug info handler
  ipcMain.handle("getDebugInfo", () => ({
    isDev: isDevMode,
    isMasDev: isMasDevMode,
    platform: process.platform,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    appVersion: app.getVersion(),
  }));

  ipcMain.handle("openExternal", (_event, url: string) => shell.openExternal(url));

  ipcMain.handle("getSystemLocale", () => app.getLocale());

  // Track whether the user has manually resized the window so we can skip
  // programmatic auto-resizes after they've taken ownership of the size.
  let userHasResized = false;
  let isProgrammaticResize = false;

  ipcMain.handle("setWindowHeight", (_event: IpcMainInvokeEvent, height: number) => {
    if (userHasResized) return;
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    const [width] = win.getSize();
    isProgrammaticResize = true;
    win.setSize(width, Math.round(height), true);
    // Reset flag after the resize event fires (~next tick)
    setTimeout(() => { isProgrammaticResize = false; }, 100);
  });

  // Setup startup handlers for launch at login
  setupStartupHandlers();

  // Mac App Store builds receive updates through the App Store, not Squirrel,
  // so electron-updater must stay completely silent for MAS. On macOS its
  // MacUpdater spins up a local HTTP proxy server to feed the update binary
  // to Squirrel.Mac, and `listen()` in App Sandbox fails with EPERM (since
  // we only grant network.client, not network.server) — surfacing as an
  // uncaught exception "Error: listen EPERM ... 127.0.0.1" a few minutes
  // after launch once the periodic update check finds something to download.
  if (!process.mas) {
    const appVersion = app.getVersion();
    if (appVersion.includes("-beta")) {
      autoUpdater.channel = "beta";
    } else if (appVersion.includes("-alpha")) {
      autoUpdater.channel = "alpha";
    }

    autoUpdater.checkForUpdatesAndNotify();
  }

  // Check if we should start minimized (hidden in tray)
  const startHidden = shouldStartMinimized();
  log.info("Starting app:", { startHidden });

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 950,
    minWidth: 1280,
    minHeight: 950,
    autoHideMenuBar: true,
    show: !startHidden, // Don't show window if starting minimized
    // transparent: true,
    // frame: false,
    vibrancy: "under-window",
    backgroundMaterial: "mica",
    // opacity: 0.85,
    // transparent: true,
    // backgroundColor: "#00000000",
    // vibrancy: "under-page",
    // darkTheme: false,
    // visualEffectState: "followWindow",
    // roundedCorners: true,
    // autoHideMenuBar: true,
    webPreferences: {
      // nodeIntegration: true,
      nodeIntegration: false,
      contextIsolation: true,
      // contextIsolation: true,
      preload: join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url); // Open URL in user's browser.
    return { action: "deny" }; // Prevent the app from opening the URL.
  });

  // 3DS fallback: Stripe redirects to the finalize endpoint after authentication.
  // For most cards, payment completes without redirect (handled in the renderer).
  // This only fires for 3DS-required cards.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const { net } = require("electron");
    if (url.includes("finalize-streak-freeze-checkout")) {
      event.preventDefault();
      net.fetch(url).catch((err: Error) => {
        console.error("Failed to call finalize-streak-freeze-checkout:", err);
      }).finally(() => {
        mainWindow.webContents.send("freeze-purchase-complete");
      });
    } else if (url.includes("finalize-checkout-session")) {
      event.preventDefault();
      net.fetch(url).catch((err: Error) => {
        console.error("Failed to call finalize-checkout-session:", err);
      }).finally(() => {
        mainWindow.webContents.send("subscription-purchase-complete");
      });
    }
  });

  mainWindow.on("resize", () => {
    if (!isProgrammaticResize) userHasResized = true;
  });

  // Set the main window reference for deep linking
  setMainWindow(mainWindow);

  // Setup system tray
  setupTray(mainWindow);

  // Setup notification scheduler IPC handlers
  setupNotificationScheduler(mainWindow);

  // Note: Even when starting hidden, we keep the dock icon visible on macOS
  // (like Slack). Clicking the dock icon will show the window.

  // mainWindow.setVibrancy("under-window");
  if (isDevMode) {
    console.log("Running in development");

    await prepareNext("./renderer");
    await mainWindow.loadURL("http://localhost:8000/");
  } else {
    await loadURL(mainWindow);
  }

  // Handle deep link if app was launched with one
  mainWindow.webContents.once("did-finish-load", () => {
    handleInitialDeepLink();
    metrics.distribution("app.startup_duration", Date.now() - appStartTime, "millisecond", {
      platform: process.platform,
      is_dev: isDevMode,
    });
    metrics.count("app.started", 1, { platform: process.platform });
  });

  // const url = isDev.default
  //   ? "http://localhost:8000/"
  //   : format({
  //       pathname: join(__dirname, "../renderer/out/index.html"),
  //       protocol: "file:",
  //       slashes: true,
  //     });

  // console.log("Loading URL", url);
});

// MAS builds skip the periodic update poll — see the matching guard around
// the initial checkForUpdatesAndNotify() call above for full context.
if (!process.mas) {
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60000);
}

autoUpdater.on("update-downloaded", (event) => {
  const message =
    (process.platform === "win32" ? event.releaseNotes : event.releaseName) ??
    "";
  const dialogOpts: MessageBoxOptions = {
    type: "info",
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message: Array.isArray(message) ? message.join("\n") : message,
    detail:
      "A new version has been downloaded. Restart the application to apply the updates.",
  };

  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      app.off("window-all-closed", app.quit);
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on("error", (message) => {
  console.error("There was a problem updating the application");
  console.error(message);
});

// Handle window-all-closed event
// On all platforms, the app stays running in the tray when windows are closed
// The app only quits when the user explicitly quits from the tray menu
app.on("window-all-closed", () => {
  // Don't quit - the app continues running in the system tray
  // Users can quit explicitly from the tray context menu
});

// Properly quit when the user explicitly quits
app.on("before-quit", () => {
  setIsQuitting(true);
});
