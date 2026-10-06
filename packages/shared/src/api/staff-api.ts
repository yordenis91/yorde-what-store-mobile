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
  PaymentSetting,
  PlanEntitlements,
  Product,
  ProductImage,
  PublicTenant,
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
      /** Every tenant the current staff user belongs to — feeds the tenant switcher. The only call that returns `myRole`. */
      listMine: () => unwrap<Tenant[]>(client.get('/tenants/me')),
      /** The active store's full settings. Readable by OWNER and STAFF alike; `smtpPassword` comes back as the `smtpPasswordSet` flag. */
      current: () => unwrap<Tenant>(client.get('/tenants/current')),
      /**
       * Partial update of the active store's settings (`PATCH /tenants/current`).
       * OWNER only — a STAFF session gets 403, so gate the UI on
       * `activeTenant.myRole` instead of letting the seller fill a form the
       * api will refuse. Send only the keys the section being saved owns: the
       * api accepts no field outside `UpdateTenantDto` (it runs with
       * `forbidNonWhitelisted: true`), and a full-object save would overwrite
       * whatever someone changed on the web since this screen loaded.
       */
      update: (changes: TenantSettingsUpdate) => unwrap<Tenant>(client.patch('/tenants/current', changes)),
      /**
       * Uploads a store image (`POST /uploads/image`) and resolves its
       * `/uploads/...` path, to be sent back in `update()`. `type` decides the
       * server-side resize: 'logo' is capped much smaller than a banner.
       */
      uploadImage: async (image: PickedImage, type?: UploadImageType) => {
        const form = new FormData()
        // React Native's FormData takes a file as { uri, name, type } rather than a Blob.
        form.append('file', { uri: image.uri, name: image.name, type: image.mimeType } as unknown as Blob)
        if (type) form.append('type', type)
        const { url } = await unwrap<{ url: string }>(
          client.post('/uploads/image', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
        )
        return url
      },
      /** Which payment providers the store has on. OWNER only. Never includes the credentials — the api strips them. */
      listPaymentSettings: () => unwrap<PaymentSetting[]>(client.get('/tenants/current/payment-settings')),
      /**
       * Saves one provider's credentials and on/off state. OWNER only.
       *
       * The api **replaces** the stored (encrypted) credentials blob with
       * exactly what goes here and never returns it to anyone, so a save with
       * blank fields silently wipes working keys. Always send the provider's
       * full credential set — `paymentCredentialsError()` is the guard the
       * screens use before calling this.
       */
      upsertPaymentSetting: (payload: UpsertPaymentSetting) =>
        unwrap<PaymentSetting>(client.put('/tenants/current/payment-settings', payload)),
      /**
       * The public storefront projection (`GET /tenants/storefront/:slug`,
       * unauthenticated). Used for one thing here: it carries
       * `zellePaymentInfo` — the Zelle recipient, which is public by design
       * since the customer needs it to pay — so the payments screen can
       * prefill those fields instead of making the owner retype them and risk
       * blanking them. Present only while Zelle is enabled and in the plan.
       */
      storefront: (slug: string) => unwrap<PublicTenant>(client.get(`/tenants/storefront/${slug}`)),
    },
    plans: {
      /** Effective plan limits. OWNER and STAFF both allowed — it's what says a channel is locked before a save fails. */
      entitlements: () => unwrap<PlanEntitlements>(client.get('/plans/current/entitlements')),
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

/** 'logo' is resized much smaller server-side than a banner or a product photo. Mirrors the web's `UploadImageType`. */
export type UploadImageType = 'logo' | 'banner' | 'product'

/**
 * The store settings the app edits. Every key is a field of the api's
 * `UpdateTenantDto`: the api runs with `forbidNonWhitelisted: true`, so one
 * extra key (`id`, `slug`, `smtpPasswordSet`, …) turns the whole save into a
 * 400. `null` clears a value; omitting a key leaves it as it is.
 */
export interface TenantSettingsUpdate {
  name?: string
  tagline?: string | null
  currencySymbol?: string
  logoUrl?: string | null
  bannerUrl?: string | null
  invoiceLogoUrl?: string | null
  theme?: string
  tracksInventory?: boolean
  whatsappEnabled?: boolean
  whatsappNumber?: string | null
  telegramEnabled?: boolean
  telegramBotToken?: string | null
  telegramChatId?: string | null
  orderMessageTemplate?: string
  termsOfSaleContent?: string | null
  shippingPolicyContent?: string | null
  returnPolicyContent?: string | null
  privacyPolicyContent?: string | null
  smtpEnabled?: boolean
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUser?: string | null
  /** Omit to keep the stored password; '' clears it. Never round-tripped back from the api. */
  smtpPassword?: string
  smtpFrom?: string | null
  socialLinks?: Record<string, string>
}

/** What `upsertPaymentSetting` sends. The credential shape per provider mirrors what the api's payments module reads back out. */
export type UpsertPaymentSetting = { isEnabled: boolean } & (
  | { provider: 'STRIPE'; credentials: { publishableKey: string; secretKey: string } }
  | { provider: 'MERCADOPAGO'; credentials: { accessToken: string } }
  | {
      provider: 'ZELLE'
      credentials: { recipientName: string; recipientEmail: string; recipientPhone: string; instructions: string }
    }
)

/**
 * Why a provider's credentials can't be saved yet, or null when they can.
 *
 * This is not cosmetic validation: `PUT /tenants/current/payment-settings`
 * overwrites the stored credentials with whatever it receives, so saving a
 * half-empty form is how a store loses its live Stripe keys. The required
 * fields are the ones the api's payment flows actually read — Zelle's phone
 * and instructions are optional there, so they are optional here too.
 */
export function paymentCredentialsError(payload: UpsertPaymentSetting): string | null {
  switch (payload.provider) {
    case 'STRIPE':
      if (!payload.credentials.publishableKey.trim()) return 'Ingresá la clave publicable (pk_...)'
      if (!payload.credentials.secretKey.trim()) return 'Ingresá la clave secreta (sk_...)'
      return null
    case 'MERCADOPAGO':
      if (!payload.credentials.accessToken.trim()) return 'Ingresá el access token de MercadoPago'
      return null
    case 'ZELLE':
      if (!payload.credentials.recipientName.trim()) return 'Ingresá el nombre del destinatario'
      if (!payload.credentials.recipientEmail.trim()) return 'Ingresá el correo o teléfono de Zelle'
      return null
  }
}

/**
 * Folds a `PATCH /tenants/current` (or `GET /tenants/current`) response into
 * the tenant already held in the session.
 *
 * Both of those responses come from `TenantsService.findCurrent`, which does
 * **not** add `myRole` — only `findMine` (`GET /tenants/me`) does. Replacing
 * the stored tenant with the response would therefore drop the role and
 * silently demote the owner to a read-only collaborator until the next app
 * start.
 */
export function mergeTenant(stored: Tenant | null, fresh: Tenant): Tenant {
  return { ...fresh, myRole: fresh.myRole ?? stored?.myRole }
}

export type StaffApi = ReturnType<typeof createStaffApi>
