import axios from 'axios'
import { useStaffAuthStore } from '../stores/staff-auth.store'
import { createHttpClient, isRefreshRejected, unwrap } from './http-factory'
import { getDeviceId } from '../utils/device-id'
import type {
  ApiEnvelope,
  CustomerDetail,
  CustomerListItem,
  CustomerSegment,
  DashboardRange,
  DashboardSummary,
  DevicePlatform,
  Order,
  OrderStatus,
  PaginatedResult,
  Product,
  ProductImage,
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
 * restore or the api rejects it — the caller routes to login. Throws, keeping
 * the stored token, when the api simply couldn't be reached.
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
  } catch (error) {
    if (!isRefreshRejected(error)) throw error
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

  async function switchTenant(tenantId: string) {
    const deviceId = await getDeviceId()
    const result = await unwrap<{ user: User; accessToken: string; mobileRefreshToken?: string }>(
      client.post('/auth/switch-tenant', { tenantId, deviceId }),
    )
    return captureMobileRefreshToken(result)
  }

  return {
    client,
    auth: {
      /**
       * Session restore on app start: rotates the persisted mobile refresh
       * token (see `refreshStaffToken`), loads the profile + tenant
       * memberships, and re-enters the store the seller last picked
       * (`lastTenantId`, or the only one they have) through `switchTenant` —
       * the same call the select-tenant screen makes, so the access token's
       * tenant claims match the `X-Tenant-ID` header. `activeTenant` is null
       * when there's no obvious store to reopen; the caller sends the user to
       * pick one. Returns null when there's no session to restore (never
       * logged in on this device, or the api rejected the refresh token) —
       * the caller routes to login. Rejects when the api couldn't be reached;
       * the stored session is kept for a retry.
       */
      bootstrap: async (): Promise<{ user: User; tenants: Tenant[]; activeTenant: Tenant | null } | null> => {
        const accessToken = await refreshStaffToken(baseURL)
        if (!accessToken) return null
        useStaffAuthStore.getState().setAccessToken(accessToken)
        const [user, tenants] = await Promise.all([
          unwrap<User>(client.get('/auth/me')),
          unwrap<Tenant[]>(client.get('/tenants/me')),
        ])
        const lastTenantId = useStaffAuthStore.getState().lastTenantId
        const activeTenant = tenants.find((t) => t.id === lastTenantId) ?? (tenants.length === 1 ? tenants[0]! : null)
        if (!activeTenant) return { user, tenants, activeTenant: null }
        const switched = await switchTenant(activeTenant.id)
        useStaffAuthStore.getState().setAccessToken(switched.accessToken)
        return { user: switched.user, tenants, activeTenant }
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
      switchTenant,
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
      /**
       * Partial update (PATCH /products/:id). Deliberately limited to the
       * fields the app edits: sending `variants` would make the api delete and
       * recreate them with new ids, breaking any cart line pointing at the old ones.
       */
      update: (id: string, changes: ProductQuickEdit) => unwrap<Product>(client.patch(`/products/${id}`, changes)),
      /** Uploads a photo (POST /uploads/image) and attaches it to the product. */
      addImage: async (id: string, image: PickedImage, options?: { isCover?: boolean }) => {
        const form = new FormData()
        // React Native's FormData takes a file as { uri, name, type } rather than a Blob.
        form.append('file', { uri: image.uri, name: image.name, type: image.mimeType } as unknown as Blob)
        const { url } = await unwrap<{ url: string }>(
          client.post('/uploads/image', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
        )
        return unwrap<ProductImage>(client.post(`/products/${id}/images`, { url, isCover: options?.isCover }))
      },
      removeImage: (id: string, imageId: string) => client.delete(`/products/${id}/images/${imageId}`),
      setCoverImage: (id: string, imageId: string) => client.patch(`/products/${id}/images/${imageId}/cover`),
    },
    orders: {
      list: (params?: OrderListParams) => unwrap<PaginatedResult<Order>>(client.get('/orders', { params })),
      get: (id: string) => unwrap<Order>(client.get(`/orders/${id}`)),
      updateStatus: (id: string, status: OrderStatus) =>
        unwrap<Order>(client.patch(`/orders/${id}/status`, { status })),
      /** Zelle only: marks the order paid and confirmed once the store has checked the customer's proof. Needs a proof to have been sent. */
      confirmZellePayment: (id: string) => unwrap<Order>(client.post(`/orders/${id}/confirm-zelle-payment`)),
      /** Zelle only: discards the proof (the order stays) so the customer can send another one. */
      rejectZellePayment: (id: string) => unwrap<Order>(client.post(`/orders/${id}/reject-zelle-payment`)),
    },
    customers: {
      list: (params?: { page?: number; limit?: number; search?: string; segment?: CustomerSegment }) =>
        unwrap<PaginatedResult<CustomerListItem>>(client.get('/customers', { params })),
      get: (id: string) => unwrap<CustomerDetail>(client.get(`/customers/${id}`)),
    },
    dashboard: {
      summary: (range: DashboardRange = '7d') =>
        unwrap<DashboardSummary>(client.get('/dashboard/summary', { params: { range } })),
    },
    devices: {
      register: (payload: { token: string; platform: DevicePlatform; deviceId: string }) =>
        unwrap<{ id: string; registered: true }>(client.post('/devices', payload)),
      /** Idempotent server-side (see api's DevicesService.revoke) — safe to call with a token that's already gone. */
      unregister: (token: string) => client.delete(`/devices/${encodeURIComponent(token)}`),
    },
  }
}

/** Filters the api accepts on `GET /orders` (OrderQueryDto). `search` matches the order number or customer name. */
export interface OrderListParams {
  page?: number
  limit?: number
  search?: string
  status?: OrderStatus
  sortBy?: 'createdAt' | 'orderNumber' | 'customerName' | 'grandTotal'
  sortDir?: 'asc' | 'desc'
  /** ISO date strings. */
  dateFrom?: string
  dateTo?: string
}

/** The product fields the app edits in place (see `products.update`). Prices go as numbers, like the web form sends them. */
export interface ProductQuickEdit {
  price?: number
  compareAtPrice?: number | null
  quantity?: number
  isActive?: boolean
  isPublished?: boolean
}

/** A picked image as React Native's FormData needs it. */
export interface PickedImage {
  uri: string
  name: string
  mimeType: string
}

export type StaffApi = ReturnType<typeof createStaffApi>
