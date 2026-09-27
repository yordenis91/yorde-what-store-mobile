import { useEffect } from 'react'
import { useCustomerAuthStore, waitForHydration } from '@yws/shared'
import { customerApi } from '../lib/api'

/** Runs once at app start: tries to restore a customer session for the remembered store, if any. */
export function useBootstrapCustomerAuth() {
  const setSession = useCustomerAuthStore((s) => s.setSession)
  const setBootstrapping = useCustomerAuthStore((s) => s.setBootstrapping)

  useEffect(() => {
    let cancelled = false
    // Same rehydration race as the staff app — see its useBootstrapStaffAuth
    // for the full explanation. Here it guards both `tenantSlug` and
    // `refreshToken`, persisted together in customer-auth.store.ts.
    waitForHydration(useCustomerAuthStore)
      .then(() => customerApi.auth.bootstrap())
      .then((customer) => {
        if (cancelled || !customer) return
        setSession({ customer, accessToken: useCustomerAuthStore.getState().accessToken! })
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
