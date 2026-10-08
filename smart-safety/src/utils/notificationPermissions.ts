import { Platform, PermissionsAndroid } from 'react-native'
import { requestNotificationPermissionStatus } from './notificationsCompat'

/**
 * Request notification permissions at runtime.
 * - iOS: uses notificationsCompat requestNotificationPermissionStatus
 * - Android 13+ (API 33): requests POST_NOTIFICATIONS via PermissionsAndroid (safe for Expo Go)
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const res = await requestNotificationPermissionStatus()
      return res === 'granted'
    }

    if (Platform.OS === 'android') {
      const sdk = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10)
      if (!isNaN(sdk) && sdk >= 33) {
        const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
        return res === PermissionsAndroid.RESULTS.GRANTED
      }
      // Older Android versions grant notifications at install time
      return true
    }

    return false
  } catch (e) {
    console.warn('Notification permission request failed:', e)
    return false
  }
}

export default requestNotificationPermission
