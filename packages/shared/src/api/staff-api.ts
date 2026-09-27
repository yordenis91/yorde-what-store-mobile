import axios from 'axios'
import { useStaffAuthStore } from '../stores/staff-auth.store'
import { createHttpClient, unwrap } from './http-factory'
import type {
  ApiEnvelope,
  CustomerDetail,
  CustomerListItem,
  DashboardRange,
  DashboardSummary,
  Order,
  PaginatedResult,
  Product,
  Tenant,
  User,
} from '../types/api'

export interface LoginPayload {
  email: string
  password: string
}

export type LoginResult = { requiresTwoFactor: true; challengeToken: string } | { user: User; accessToken: string }

/**
 * See the "KNOWN GAP" note in `staff-auth.store.ts`: this relies on the
 * platform's native cookie jar carrying the httpOnly `refresh_token` cookie
 * set by `POST /auth/login`, which axios/RN does for the lifetime of the
 * process but not reliably across an app kill+relaunch. Until the api adds a
 * mobile-safe refresh path, a cold start after the access token expired means
 * this resolves null and the user re-authenticates.
 */
async function refreshStaffToken(baseURL: string): Promise<string | null> {
  try {
    const { data } = await axios.post<ApiEnvelope<{ accessToken: string }>>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    return data.data.accessToken
  } catch {
    return null
  }
}

/**
 * Builds the staff/admin API surface — its own axios instance, its own token
 * source (`useStaffAuthStore`), isolated from the customer realm. Call once
 * near the app root and share the instance via context/module scope; never
 * construct one per screen (that would defeat the single-flight refresh).
 */
export function createStaffApi(baseURL: string) {
  const client = createHttpClient({
    baseURL,
    getAccessToken: () => useStaffAuthStore.getState().accessToken,
    getTenantId: () => useStaffAuthStore.getState().activeTenant?.id ?? null,
    onTokenRefreshed: (accessToken) => useStaffAuthStore.getState().setAccessToken(accessToken),
    onAuthExpired: () => useStaffAuthStore.getState().clear(),
    refresh: () => refreshStaffToken(baseURL),
    authPathPrefix: 'auth/',
  })

  return {
    client,
    auth: {
      /**
       * Best-effort session restore on app start: attempts a refresh (see the
       * cookie-jar caveat above), and on success loads the profile + tenant
       * memberships. Returns null when there's no session to restore — the
       * caller routes to login. This is the exported hook the refresh gap
       * should eventually replace with something that actually works across
       * a killed app.
       */
      bootstrap: async (): Promise<{ user: User; tenants: Tenant[] } | null> => {
        const accessToken = await refreshStaffToken(baseURL)
        if (!accessToken) return null
        useStaffAuthStore.getState().setAccessToken(accessToken)
        const [user, tenants] = await Promise.all([
          unwrap<User>(client.get('/auth/me')),
          unwrap<Tenant[]>(client.get('/tenants/me')),
        ])
        return { user, tenants }
      },
      login: (payload: LoginPayload) => unwrap<LoginResult>(client.post('/auth/login', payload)),
      register: (payload: { email: string; password: string; name: string; storeName: string; storeSlug: string }) =>
        unwrap<{ user: User; tenant: Tenant; accessToken: string }>(client.post('/auth/register', payload)),
      verifyTwoFactor: (challengeToken: string, code: string) =>
        unwrap<{ user: User; accessToken: string }>(client.post('/auth/2fa/verify', { challengeToken, code })),
      me: () => unwrap<User>(client.get('/auth/me')),
      logout: () => client.post('/auth/logout'),
      switchTenant: (tenantId: string) =>
        unwrap<{ user: User; accessToken: string }>(client.post('/auth/switch-tenant', { tenantId })),
      forgotPassword: (email: string) => unwrap<{ sent: boolean }>(client.post('/auth/forgot-password', { email })),
      resetPassword: (token: string, password: string) =>
        unwrap<{ reset: boolean }>(client.post('/auth/reset-password', { token, password })),
    },
    tenants: {
      /** Every tenant the current staff user belongs to — feeds the tenant switcher. */
      listMine: () => unwrap<Tenant[]>(client.get('/tenants/me')),
      current: () => unwrap<Tenant>(client.get('/tenants/current')),
    },
    products: {
      list: (params?: { page?: number; limit?: number; search?: string }) =>
        unwrap<PaginatedResult<Product>>(client.get('/products', { params })),
      get: (id: string) => unwrap<Product>(client.get(`/products/${id}`)),
    },
    orders: {
      list: (params?: { page?: number; limit?: number; status?: string }) =>
        unwrap<PaginatedResult<Order>>(client.get('/orders', { params })),
      get: (id: string) => unwrap<Order>(client.get(`/orders/${id}`)),
      updateStatus: (id: string, status: string) => unwrap<Order>(client.patch(`/orders/${id}/status`, { status })),
    },
    customers: {
      list: (params?: { page?: number; limit?: number; search?: string }) =>
        unwrap<PaginatedResult<CustomerListItem>>(client.get('/customers', { params })),
      get: (id: string) => unwrap<CustomerDetail>(client.get(`/customers/${id}`)),
    },
    dashboard: {
      summary: (range: DashboardRange = '7d') =>
        unwrap<DashboardSummary>(client.get('/dashboard/summary', { params: { range } })),
    },
  }
}

export type StaffApi = ReturnType<typeof createStaffApi>
