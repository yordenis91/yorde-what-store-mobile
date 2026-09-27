import { useEffect } from 'react'
import { useCustomerAuthStore } from '@yws/shared'
import { customerApi } from '../lib/api'

/** Runs once at app start: tries to restore a customer session for the remembered store, if any. */
export function useBootstrapCustomerAuth() {
  const setSession = useCustomerAuthStore((s) => s.setSession)
  const setBootstrapping = useCustomerAuthStore((s) => s.setBootstrapping)

  useEffect(() => {
    let cancelled = false
    customerApi.auth
      .bootstrap()
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
