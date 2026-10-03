import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'

const SESSION_KEY = 'yws-analytics-session'
let cached: Promise<string | undefined> | null = null

/**
 * Anonymous, per-install id that groups this app's pageviews and orders into
 * "one shopper" for the store's conversion metrics — the app's counterpart to
 * the web client's `getAnalyticsSessionId` (localStorage there). Deliberately
 * not the `deviceId`: that one binds refresh tokens and never leaves the auth
 * calls. Resolves undefined rather than failing: analytics must never block a
 * pageview or a purchase.
 */
export function getAnalyticsSessionId(): Promise<string | undefined> {
  cached ??= (async () => {
    try {
      const existing = await AsyncStorage.getItem(SESSION_KEY)
      if (existing) return existing
      const id = Crypto.randomUUID()
      await AsyncStorage.setItem(SESSION_KEY, id)
      return id
    } catch {
      return undefined
    }
  })()
  return cached
}

/**
 * Where app traffic comes from, as the dashboard's "top referrers" shows it —
 * the `android-app://` / `ios-app://` form analytics tools use for apps.
 */
export const APP_REFERRER = `${Platform.OS === 'ios' ? 'ios-app' : 'android-app'}://com.yordewhatstore.customer`
