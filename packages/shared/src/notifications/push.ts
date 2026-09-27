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

/**
 * Requests permission and returns this device's Expo push token, or null if
 * denied/unavailable (simulators, web).
 *
 * NOT wired to the backend yet — flagged in the mobile README's "Open backend
 * questions": `yorde-what-store-api` has no push-notification module or
 * device-token endpoint today (grepped for push/fcm/expo/device-token, none
 * found). Sending an order/payment push requires:
 *   1. An endpoint to register/unregister a device token per user (staff) or
 *      customer, tenant-scoped like everything else.
 *   2. The queue's `order-notification.processor.ts` (which already renders
 *      the WhatsApp/Telegram fulfillment message) to also fan out a push.
 * Call this once on app start once that lands; for now it's dead code kept
 * ready to wire up, not invoked from either app's root layout.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

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
