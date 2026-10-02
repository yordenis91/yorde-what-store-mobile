import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }
}

/**
 * Requests permission (prompting the OS dialog if not yet decided) and
 * returns this device's Expo push token, or null if denied/unavailable
 * (simulators, web). Call this only after the app's own pre-prompt has
 * gotten an explicit "yes" — the OS dialog can only be shown once
 * meaningfully per install on iOS, so this shouldn't fire before the user
 * has opted in to seeing it. See `apps/staff/src/hooks/usePushRegistration.ts`
 * for where that pre-prompt lives and when it's shown.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  await ensureAndroidChannel()

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') return null

  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}

/**
 * Reads this device's push token WITHOUT prompting — resolves null if
 * permission was never granted (or has since been revoked in system
 * settings). Used on logout: unregistering the token server-side only makes
 * sense if we can still read it, and asking permission again just to turn
 * around and revoke it would be backwards.
 */
export async function getExpoPushTokenIfGranted(): Promise<string | null> {
  const existing = await Notifications.getPermissionsAsync()
  if (existing.status !== 'granted') return null
  const token = await Notifications.getExpoPushTokenAsync()
  return token.data
}
