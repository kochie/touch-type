/**
 * Windows Notification Service Channel Creation
 * 
 * This module handles WNS push channel creation for Windows.
 * Requires the app to be packaged as APPX/MSIX for Windows Store.
 */

import log from 'electron-log';

/**
 * Create a push notification channel for WNS
 * This uses the Windows Runtime API available in APPX/MSIX packages
 */
export async function createPushNotificationChannel(): Promise<string> {
  // This requires node-windows-runtime or similar package
  // For Electron apps distributed through the Microsoft Store
  
  try {
    // Dynamic require to avoid errors on non-Windows platforms
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PushNotificationChannelManager } = require('@aspect/windows-push');
    
    const channel = await PushNotificationChannelManager
      .createPushNotificationChannelForApplicationAsync();
    
    log.info('WNS channel created:', channel.uri.substring(0, 50) + '...');
    
    // Set up expiration handling - channels typically expire after 30 days
    if (channel.expirationTime) {
      const expiresAt = new Date(channel.expirationTime);
      log.info('WNS channel expires:', expiresAt.toISOString());
    }
    
    return channel.uri;
  } catch (error) {
    log.error('Failed to create WNS channel:', error);
    
    // Fallback: try using electron-windows-notifications
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getChannelUri } = require('electron-windows-notifications');
      const uri = await getChannelUri();
      log.info('WNS channel created via fallback');
      return uri;
    } catch (fallbackError) {
      log.error('WNS fallback also failed:', fallbackError);
      throw new Error('WNS channel creation failed - ensure app is packaged as APPX/MSIX');
    }
  }
}

/**
 * Handle incoming WNS push notification
 */
export function handleWNSNotification(args: {
  action?: string;
  duration?: number;
}): void {
  log.info('WNS notification received:', args);
  // The notification handling is done in the main process
  // This function can be used to parse launch arguments
}

/**
 * Parse WNS launch arguments from app activation
 * When a toast notification is clicked, the app is launched with these arguments
 */
export function parseWNSLaunchArgs(launchArgs: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (!launchArgs) return params;
  
  // Parse query string format: action=practice&duration=5
  const pairs = launchArgs.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  
  return params;
}
