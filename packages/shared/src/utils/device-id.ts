import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'

const DEVICE_ID_KEY = 'yws-device-id'

let cached: string | null = null

/**
 * A stable identifier for this app install, generated once and persisted in
 * SecureStore. Both API realms send this on every login/register/refresh
 * call — the api binds each mobile refresh-token family to the deviceId it
 * was issued to (see api's MobileRefreshDto), rejecting (and revoking the
 * whole family) a refresh presented with a different one. It must stay the
 * same across app restarts for refresh to keep working; reinstalling the
 * app wipes SecureStore and mints a new one, which is the correct behavior —
 * a reinstalled app has no business inheriting the old install's session.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (existing) {
    cached = existing
    return existing
  }
  const created = Crypto.randomUUID()
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created)
  cached = created
  return created
}
