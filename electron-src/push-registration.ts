/**
 * Native Push Notification Registration
 * 
 * Handles registration for platform-specific push notification services:
 * - macOS: Apple Push Notification Service (APNS)
 * - Windows: Windows Notification Service (WNS)
 * - Linux: Falls back to local scheduler
 */

import { app, pushNotifications, Notification } from 'electron';
import log from 'electron-log';

export interface PushRegistrationResult {
  success: boolean;
  platform: 'macos' | 'windows' | 'linux';
  token?: string;
  channelUri?: string;
  error?: string;
}

export interface PushNotificationPayload {
  action?: string;
  duration?: number;
  title?: string;
  body?: string;
}

// Callback for when a push notification is received
let onPushNotificationReceived: ((payload: PushNotificationPayload) => void) | null = null;

/**
 * Register callback for push notification events
 */
export function setPushNotificationHandler(
  handler: (payload: PushNotificationPayload) => void
): void {
  onPushNotificationReceived = handler;
}

/**
 * Register for push notifications based on platform
 */
export async function registerForPushNotifications(): Promise<PushRegistrationResult> {
  const platform = process.platform;

  switch (platform) {
    case 'darwin':
      return registerAPNS();
    case 'win32':
      return registerWNS();
    case 'linux':
      return {
        success: true,
        platform: 'linux',
        // Linux doesn't support native push, will use local scheduler fallback
      };
    default:
      return {
        success: false,
        platform: 'linux',
        error: `Unsupported platform: ${platform}`,
      };
  }
}

/**
 * Check if the app is running in a development/unsigned environment
 * where APNS won't work due to bundle identifier mismatch
 */
function isUnsignedBuild(): boolean {
  // Check if running in development mode (not packaged at all)
  const isDev = !app.isPackaged;
  
  // Check if MAS build - these always work with APNS
  const isMas = !!process.mas;
  
  log.info(`APNS environment check - isPackaged: ${app.isPackaged}, isDev: ${isDev}, isMas: ${isMas}`);
  
  // APNS definitely works in:
  // 1. MAS builds (always sandboxed and signed)
  if (isMas) {
    return false; // Not unsigned, APNS will work
  }
  
  // 2. Development mode (not packaged) - APNS won't work
  if (isDev) {
    return true;
  }
  
  // 3. For packaged non-MAS builds, we can't easily detect if it's signed
  // We'll attempt APNS and let it fail gracefully with a helpful error
  // The error handler below will catch "Bundle identifier mismatch"
  return false;
}

/**
 * Register for Apple Push Notification Service (macOS)
 */
async function registerAPNS(): Promise<PushRegistrationResult> {
  return new Promise((resolve) => {
    try {
      // Check if push notifications are supported
      if (!pushNotifications) {
        log.warn('Push notifications not available in this Electron version');
        resolve({
          success: false,
          platform: 'macos',
          error: 'Push notifications not supported',
        });
        return;
      }

      // Check if running unsigned - APNS won't work
      if (isUnsignedBuild()) {
        log.warn('APNS not available in unsigned/development builds - bundle identifier mismatch will occur');
        log.info('For local development, use local notifications instead');
        resolve({
          success: false,
          platform: 'macos',
          error: 'APNS requires a signed build. Push notifications are not available in development mode.',
        });
        return;
      }

      // Set up event handlers before registering
      pushNotifications.on('received-apns-notification', (_event, userInfo) => {
        log.info('Received APNS notification:', userInfo);
        
        const payload: PushNotificationPayload = {
          action: userInfo.action,
          duration: userInfo.duration,
          title: userInfo.aps?.alert?.title,
          body: userInfo.aps?.alert?.body,
        };

        // Always trigger the notification handler
        // The handler will show a system notification and handle user interaction
        if (onPushNotificationReceived) {
          onPushNotificationReceived(payload);
        }
      });

      // Check current notification permission status
      log.info('Notification supported:', Notification.isSupported());

      // Register for APNS
      log.info('Registering for APNS notifications...');
      pushNotifications.registerForAPNSNotifications().then((token) => {
        log.info('APNS registration successful, token:', token.substring(0, 20) + '...');
        resolve({
          success: true,
          platform: 'macos',
          token,
        });
      }).catch((error) => {
        const errorStr = error.message || String(error);
        log.error('APNS registration failed:', error);
        
        // Provide helpful error message for common issues
        let userFriendlyError = errorStr;
        if (errorStr.includes('Bundle identifier mismatch') || errorStr.includes('NSOSStatusErrorDomain')) {
          userFriendlyError = 'Push notifications require a properly signed app. ' +
            'This error is expected for unsigned/development builds. ' +
            'To test push notifications, build with a valid code signing identity and provisioning profile.';
          log.info('Bundle identifier mismatch - this is expected for unsigned builds');
        }
        
        resolve({
          success: false,
          platform: 'macos',
          error: userFriendlyError,
        });
      });
    } catch (error) {
      log.error('APNS setup error:', error);
      resolve({
        success: false,
        platform: 'macos',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

/**
 * Register for Windows Notification Service (Windows)
 */
async function registerWNS(): Promise<PushRegistrationResult> {
  try {
    // Windows push notifications require the electron-windows-notifications package
    // or using the Windows Runtime API directly
    
    // For now, we'll use a placeholder that can be implemented with:
    // 1. electron-windows-notifications package
    // 2. @aspect/windows-push package
    // 3. Direct WinRT API access
    
    log.info('Attempting WNS registration...');
    
    // Check if we're running as a packaged APPX/MSIX
    const isAppx = process.windowsStore || false;
    
    if (!isAppx) {
      log.warn('WNS requires APPX/MSIX packaging');
      return {
        success: false,
        platform: 'windows',
        error: 'WNS requires Windows Store packaging',
      };
    }

    // Try to use Windows Runtime API for push channel
    // This requires the app to be packaged as APPX/MSIX
    try {
      // Dynamic import to avoid errors on non-Windows platforms
      const { createPushNotificationChannel } = await import('./wns-channel.js');
      const channelUri = await createPushNotificationChannel();
      
      log.info('WNS registration successful');
      return {
        success: true,
        platform: 'windows',
        channelUri,
      };
    } catch (wnsError) {
      log.error('WNS channel creation failed:', wnsError);
      return {
        success: false,
        platform: 'windows',
        error: wnsError instanceof Error ? wnsError.message : String(wnsError),
      };
    }
  } catch (error) {
    log.error('WNS setup error:', error);
    return {
      success: false,
      platform: 'windows',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Unregister from push notifications
 */
export async function unregisterFromPushNotifications(): Promise<void> {
  const platform = process.platform;

  if (platform === 'darwin' && pushNotifications) {
    try {
      pushNotifications.unregisterForAPNSNotifications();
      log.info('Unregistered from APNS');
    } catch (error) {
      log.error('Failed to unregister from APNS:', error);
    }
  }
  
  // WNS doesn't have an explicit unregister - just stop sending to the channel
}

/**
 * Check if push notifications are supported on this platform
 */
export function isPushSupported(): boolean {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    return !!pushNotifications;
  }
  
  if (platform === 'win32') {
    // WNS support depends on packaging
    return !!process.windowsStore;
  }
  
  // Linux doesn't support native push
  return false;
}

/**
 * Get the current platform for push notifications
 */
export function getPushPlatform(): 'macos' | 'windows' | 'linux' {
  switch (process.platform) {
    case 'darwin':
      return 'macos';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
}
