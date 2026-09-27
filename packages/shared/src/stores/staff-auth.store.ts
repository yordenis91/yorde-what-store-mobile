import { create } from 'zustand'
import type { Tenant, User } from '../types/api'

/**
 * Staff/seller session. `accessToken` is deliberately in-memory only — same
 * posture as the web client (see its auth.store.ts): a bearer token has no
 * business sitting in persisted storage where it'd outlive the process.
 *
 * KNOWN GAP (flagged, not silently worked around — see mobile README "Open
 * backend questions"): the api's `POST /auth/refresh` hands back a new access
 * token by reading a `refresh_token` httpOnly cookie it set on login. That
 * works out of the box in a browser; on React Native there is no persistent,
 * app-restart-surviving cookie jar without adding a native cookie-jar library
 * we haven't wired in yet. Today, `useBootstrapStaffAuth` best-efforts a
 * refresh on cold start using axios' in-process cookie handling, which can
 * carry a same-session cookie but is NOT guaranteed to survive the app being
 * killed and relaunched. Until the api exposes a mobile-safe refresh path
 * (e.g. returning the refresh token in the body for a request tagged
 * `X-Client: mobile`, so we can store it ourselves in SecureStore), a killed
 * app will fall back to asking the user to log in again — an acceptable, but
 * temporary, UX gap.
 */
interface StaffAuthState {
  user: User | null
  accessToken: string | null
  activeTenant: Tenant | null
  tenants: Tenant[]
  isBootstrapping: boolean
  setSession: (payload: { user: User; accessToken: string }) => void
  setAccessToken: (accessToken: string | null) => void
  setTenants: (tenants: Tenant[]) => void
  setActiveTenant: (tenant: Tenant | null) => void
  setBootstrapping: (value: boolean) => void
  clear: () => void
}

export const useStaffAuthStore = create<StaffAuthState>((set) => ({
  user: null,
  accessToken: null,
  activeTenant: null,
  tenants: [],
  isBootstrapping: true,
  setSession: ({ user, accessToken }) => set({ user, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setTenants: (tenants) => set({ tenants }),
  setActiveTenant: (activeTenant) => set({ activeTenant }),
  setBootstrapping: (isBootstrapping) => set({ isBootstrapping }),
  clear: () => set({ user: null, accessToken: null, activeTenant: null, tenants: [] }),
}))
