import { useEffect } from 'react'
import { useStaffAuthStore, waitForHydration } from '@yws/shared'
import { staffApi } from '../lib/api'

/** Runs once at app start: tries to restore a session, then stops blocking navigation either way. */
export function useBootstrapStaffAuth() {
  const setSession = useStaffAuthStore((s) => s.setSession)
  const setTenants = useStaffAuthStore((s) => s.setTenants)
  const setActiveTenant = useStaffAuthStore((s) => s.setActiveTenant)
  const setBootstrapping = useStaffAuthStore((s) => s.setBootstrapping)

  useEffect(() => {
    let cancelled = false
    // The persisted refreshToken (see staff-auth.store.ts) is only readable
    // once SecureStore's async rehydration finishes — without this, bootstrap
    // can run first, see refreshToken still null, and silently skip
    // restoring a session that was actually there.
    waitForHydration(useStaffAuthStore)
      .then(() => staffApi.auth.bootstrap())
      .then((result) => {
        if (cancelled || !result) return
        setSession({ user: result.user, accessToken: useStaffAuthStore.getState().accessToken! })
        setTenants(result.tenants)
        setActiveTenant(result.tenants[0] ?? null)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBootstrapping(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
