import { useEffect } from 'react'
import { useCustomerAuthStore, waitForHydration } from '@yws/shared'
import { customerApi } from '../lib/api'

let inFlight: Promise<void> | null = null

/**
 * Tries to restore a customer session for the remembered store, if any. Same
 * design as the staff app's `restoreStaffSession`: an unreachable api keeps
 * the stored refresh token, and the account screen offers to call this again.
 */
export function restoreCustomerSession(): Promise<void> {
  inFlight ??= (async () => {
    const store = useCustomerAuthStore.getState()
    store.setBootstrapping(true)
    try {
      // Same rehydration race as the staff app — see its restoreStaffSession
      // for the full explanation. Here it guards both `tenantSlug` and
      // `refreshToken`, persisted together in customer-auth.store.ts.
      await waitForHydration(useCustomerAuthStore)
      const customer = await customerApi.auth.bootstrap()
      if (!customer) return
      store.setSession({ customer, accessToken: useCustomerAuthStore.getState().accessToken! })
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

/** Runs `restoreCustomerSession` once at app start. */
export function useBootstrapCustomerAuth() {
  useEffect(() => {
    restoreCustomerSession()
  }, [])
}
