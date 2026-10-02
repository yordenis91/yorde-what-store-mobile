import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Tenant, User } from '../types/api'
import { secureJsonStorage } from '../storage/secure-json-storage'

/**
 * Staff/seller session. `accessToken` is deliberately in-memory only — same
 * posture as the web client (see its auth.store.ts): a bearer token has no
 * business sitting in persisted storage where it'd outlive the process.
 *
 * `refreshToken` IS persisted (SecureStore) — it's the mobile-safe refresh
 * token from `POST /auth/login`'s `mobileRefreshToken` field (see
 * `staff-api.ts`), which exists specifically so a killed-and-relaunched app
 * can restore its session instead of forcing a re-login. It rotates on every
 * use (`staff-api.ts`'s `refreshStaffToken` overwrites it via
 * `setRefreshToken` each time) and is cleared on logout or when the api
 * rejects it (not on a mere network failure — see `isRefreshRejected`).
 *
 * `lastTenantId` is persisted too, so a relaunch reopens the store the
 * seller last picked instead of whichever one `/tenants/me` lists first.
 * It's a device-level preference, not a credential: `clear()` keeps it, and
 * bootstrap only honours it if the restored user still belongs to it.
 */
interface StaffAuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  activeTenant: Tenant | null
  lastTenantId: string | null
  tenants: Tenant[]
  isBootstrapping: boolean
  setSession: (payload: { user: User; accessToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setRefreshToken: (refreshToken: string | null) => void
  setTenants: (tenants: Tenant[]) => void
  setActiveTenant: (tenant: Tenant | null) => void
  setBootstrapping: (value: boolean) => void
  clear: () => void
}

export const useStaffAuthStore = create<StaffAuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      activeTenant: null,
      lastTenantId: null,
      tenants: [],
      isBootstrapping: true,
      setSession: ({ user, accessToken }) => set({ user, accessToken }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setTenants: (tenants) => set({ tenants }),
      setActiveTenant: (activeTenant) =>
        set((state) => ({ activeTenant, lastTenantId: activeTenant?.id ?? state.lastTenantId })),
      setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null, activeTenant: null, tenants: [] }),
    }),
    {
      name: 'yws-staff-auth',
      storage: createJSONStorage(() => secureJsonStorage),
      partialize: (state) => ({ refreshToken: state.refreshToken, lastTenantId: state.lastTenantId }),
    },
  ),
)
