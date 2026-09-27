import axios from 'axios'
import { useStaffAuthStore } from '../stores/staff-auth.store'
import { createHttpClient, unwrap } from './http-factory'
import { getDeviceId } from '../utils/device-id'
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

export type LoginResult =
  | { requiresTwoFactor: true; challengeToken: string }
  | { user: User; accessToken: string; mobileRefreshToken?: string }

/**
 * Rotates the mobile-safe refresh token (`POST /auth/mobile/refresh`,
 * `{refreshToken, deviceId}` → `{accessToken, refreshToken}`) — the
 * counterpart to the web client's httpOnly-cookie refresh, which native has
 * no equivalent persistent cookie jar for. `deviceId` must be the same one
 * the token was issued to: the api revokes the whole refresh-token family on
 * a mismatch (see its MobileRefreshDto), so presenting the right token from
 * a different install is treated the same as a stolen, reused token.
 * Returns null (and clears the stored refresh token) when there's nothing to
 * restore or the api rejects it — the caller routes to login either way.
 */
async function refreshStaffToken(baseURL: string): Promise<string | null> {
  const refreshToken = useStaffAuthStore.getState().refreshToken
  if (!refreshToken) return null
  try {
    const deviceId = await getDeviceId()
    const { data } = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${baseURL}/auth/mobile/refresh`,
      { refreshToken, deviceId },
    )
    useStaffAuthStore.getState().setRefreshToken(data.data.refreshToken)
    return data.data.accessToken
  } catch {
    useStaffAuthStore.getState().setRefreshToken(null)
    return null
  }
}

/** Persists `mobileRefreshToken` from a login/register/2fa/switch-tenant response, if present, and strips it from the returned shape the caller sees. */
function captureMobileRefreshToken<T extends { mobileRefreshToken?: string }>(result: T): T {
  if (result.mobileRefreshToken) {
    useStaffAuthStore.getState().setRefreshToken(result.mobileRefreshToken)
  }
  return result
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
       * Session restore on app start: rotates the persisted mobile refresh
       * token (see `refreshStaffToken`) and, on success, loads the profile +
       * tenant memberships. Returns null when there's no session to restore
       * (never logged in on this device, or the refresh token was revoked/
       * expired) — the caller routes to login.
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
      login: async (payload: LoginPayload) => {
        const deviceId = await getDeviceId()
        const result = await unwrap<LoginResult>(client.post('/auth/login', { ...payload, deviceId }))
        return 'requiresTwoFactor' in result ? result : captureMobileRefreshToken(result)
      },
      register: async (payload: {
        email: string
        password: string
        name: string
        storeName: string
        storeSlug: string
      }) => {
        const deviceId = await getDeviceId()
        const result = await unwrap<{ user: User; tenant: Tenant; accessToken: string; mobileRefreshToken?: string }>(
          client.post('/auth/register', { ...payload, deviceId }),
        )
        return captureMobileRefreshToken(result)
      },
      verifyTwoFactor: async (challengeToken: string, code: string) => {
        const deviceId = await getDeviceId()
        const result = await unwrap<{ user: User; accessToken: string; mobileRefreshToken?: string }>(
          client.post('/auth/2fa/verify', { challengeToken, code, deviceId }),
        )
        return captureMobileRefreshToken(result)
      },
      me: () => unwrap<User>(client.get('/auth/me')),
      logout: async () => {
        try {
          await client.post('/auth/logout')
        } finally {
          // Web logout only revokes the httpOnly cookie's refresh token; the
          // api has no endpoint yet to revoke a mobile refresh family (see
          // the mobile README's open backend questions), so this at least
          // stops the device itself from using the stored one again.
          useStaffAuthStore.getState().setRefreshToken(null)
        }
      },
      switchTenant: async (tenantId: string) => {
        const deviceId = await getDeviceId()
        const result = await unwrap<{ user: User; accessToken: string; mobileRefreshToken?: string }>(
          client.post('/auth/switch-tenant', { tenantId, deviceId }),
        )
        return captureMobileRefreshToken(result)
      },
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
