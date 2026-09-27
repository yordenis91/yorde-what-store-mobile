import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Customer } from '../types/api'
import { secureJsonStorage } from '../storage/secure-json-storage'

/**
 * Customer/storefront session, one per device — there is no subdomain on
 * native, so `tenantSlug` is how the customer app remembers which store it's
 * shopping (set from a deep link or the store-picker screen; see
 * `useCustomerApi`, which reads it for the `X-Tenant-ID` header). Persisted
 * (SecureStore) so relaunching the app returns to the last store instead of
 * the picker every time.
 *
 * `accessToken` is NOT persisted, same rationale — and same cookie-based
 * refresh gap — as `staff-auth.store.ts`.
 */
interface CustomerAuthState {
  tenantSlug: string | null
  customer: Customer | null
  accessToken: string | null
  isBootstrapping: boolean
  setTenantSlug: (slug: string | null) => void
  setSession: (payload: { customer: Customer; accessToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setBootstrapping: (value: boolean) => void
  clear: () => void
}

export const useCustomerAuthStore = create<CustomerAuthState>()(
  persist(
    (set, get) => ({
      tenantSlug: null,
      customer: null,
      accessToken: null,
      isBootstrapping: true,
      setTenantSlug: (slug) => {
        if (get().tenantSlug !== slug) {
          set({ tenantSlug: slug, customer: null, accessToken: null })
        }
      },
      setSession: ({ customer, accessToken }) => set({ customer, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
      clear: () => set({ customer: null, accessToken: null }),
    }),
    {
      name: 'yws-customer-auth',
      storage: createJSONStorage(() => secureJsonStorage),
      partialize: (state) => ({ tenantSlug: state.tenantSlug }),
    },
  ),
)
