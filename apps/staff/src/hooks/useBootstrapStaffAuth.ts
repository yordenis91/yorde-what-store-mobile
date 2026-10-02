import { useEffect } from 'react'
import { useStaffAuthStore, waitForHydration } from '@yws/shared'
import { staffApi } from '../lib/api'

let inFlight: Promise<void> | null = null

/**
 * Tries to restore the persisted session, then stops blocking navigation
 * either way. If the api couldn't be reached, the stored refresh token is kept
 * (see `isRefreshRejected`) and the entry route offers a retry instead of
 * dropping the seller on the login screen — call this again for that retry.
 */
export function restoreStaffSession(): Promise<void> {
  inFlight ??= (async () => {
    const store = useStaffAuthStore.getState()
    store.setBootstrapping(true)
    try {
      // The persisted refreshToken (see staff-auth.store.ts) is only readable
      // once SecureStore's async rehydration finishes — without this, bootstrap
      // can run first, see refreshToken still null, and silently skip
      // restoring a session that was actually there.
      await waitForHydration(useStaffAuthStore)
      const result = await staffApi.auth.bootstrap()
      if (!result) return
      store.setSession({ user: result.user, accessToken: useStaffAuthStore.getState().accessToken! })
      store.setTenants(result.tenants)
      store.setActiveTenant(result.activeTenant)
    } catch {
      // Unreachable api: don't leave a half-restored session behind.
      store.setAccessToken(null)
    } finally {
      store.setBootstrapping(false)
      inFlight = null
    }
  })()
  return inFlight
}

/** Runs `restoreStaffSession` once at app start. */
export function useBootstrapStaffAuth() {
  useEffect(() => {
    restoreStaffSession()
  }, [])
}
