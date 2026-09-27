import axios from 'axios'
import { useCustomerAuthStore } from '../stores/customer-auth.store'
import { createHttpClient, unwrap } from './http-factory'
import { getDeviceId } from '../utils/device-id'
import type { ApiEnvelope, Customer, CustomerOrderSummary, Order, PaginatedResult, Product, PublicTenant } from '../types/api'

export interface CustomerRegisterPayload {
  name: string
  email?: string
  phone?: string
  password: string
}

export interface CustomerLoginPayload {
  email: string
  password: string
}

/** Mirrors `yorde-what-store-client/src/services/orders.service.ts`'s `OrderQuote`. */
export interface OrderQuote {
  currency: string
  subtotal: number
  taxTotal: number
  discountTotal: number
  shippingTotal: number
  grandTotal: number
  coupon: { code: string; discountType: 'PERCENTAGE' | 'FLAT' } | null
  couponError: string | null
  shipping: { id: string; name: string; cost: number } | null
  stockIssues: { productId: string; variantId: string | null; name: string; requested: number; available: number }[]
}

export interface CreateOrderPayload {
  customerName: string
  customerEmail?: string
  customerPhone?: string
  items: { productId: string; variantId?: string; quantity: number }[]
  couponCode?: string
  shippingId?: string
  fulfillmentMethod: 'WHATSAPP' | 'TELEGRAM' | 'STRIPE' | 'MERCADOPAGO'
  shippingAddress?: Record<string, unknown>
  sessionId?: string
}

/** Mirrors `yorde-what-store-client/src/services/orders.service.ts`'s `CreateOrderResult`. */
export type CreateOrderResult =
  | { order: Order; fulfillment: { type: 'WHATSAPP'; redirectUrl: string } }
  | { order: Order; fulfillment: { type: 'TELEGRAM'; queued: true } }
  | { order: Order; fulfillment: { type: 'STRIPE' } }
  | { order: Order; fulfillment: { type: 'MERCADOPAGO' } }

/**
 * Rotates the mobile-safe refresh token — see `staff-api.ts`'s
 * `refreshStaffToken` doc comment for the full rationale (same design, this
 * realm's own endpoint and store).
 */
async function refreshCustomerToken(baseURL: string, tenantSlug: string | null): Promise<string | null> {
  const refreshToken = useCustomerAuthStore.getState().refreshToken
  if (!refreshToken) return null
  try {
    const deviceId = await getDeviceId()
    const { data } = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${baseURL}/storefront/customers/auth/mobile/refresh`,
      { refreshToken, deviceId },
      { headers: tenantSlug ? { 'X-Tenant-ID': tenantSlug } : undefined },
    )
    useCustomerAuthStore.getState().setRefreshToken(data.data.refreshToken)
    return data.data.accessToken
  } catch {
    useCustomerAuthStore.getState().setRefreshToken(null)
    return null
  }
}

/** Persists `mobileRefreshToken` from a register/login response, if present, and strips it from the returned shape the caller sees. */
function captureMobileRefreshToken<T extends { mobileRefreshToken?: string }>(result: T): T {
  if (result.mobileRefreshToken) {
    useCustomerAuthStore.getState().setRefreshToken(result.mobileRefreshToken)
  }
  return result
}

/**
 * Builds the customer/storefront API surface — its own axios instance, its
 * own token source (`useCustomerAuthStore`) and its own tenant header (the
 * remembered store slug, since native has no subdomain). Isolated from
 * `createStaffApi` on purpose: the two bearer tokens must never cross.
 */
export function createCustomerApi(baseURL: string) {
  const client = createHttpClient({
    baseURL,
    getAccessToken: () => useCustomerAuthStore.getState().accessToken,
    getTenantId: () => useCustomerAuthStore.getState().tenantSlug,
    onTokenRefreshed: (accessToken) => useCustomerAuthStore.getState().setAccessToken(accessToken),
    onAuthExpired: () => useCustomerAuthStore.getState().clear(),
    refresh: () => refreshCustomerToken(baseURL, useCustomerAuthStore.getState().tenantSlug),
    authPathPrefix: 'storefront/customers/auth/',
  })

  return {
    client,
    tenant: {
      /** Public lookup by slug — powers the "enter your store" screen and deep-link resolution. */
      bySlug: (slug: string) => unwrap<PublicTenant>(client.get(`/tenants/storefront/${slug}`)),
    },
    auth: {
      /** Session restore on app start — same design as `staffApi.auth.bootstrap`. */
      bootstrap: async (): Promise<Customer | null> => {
        const tenantSlug = useCustomerAuthStore.getState().tenantSlug
        if (!tenantSlug) return null
        const accessToken = await refreshCustomerToken(baseURL, tenantSlug)
        if (!accessToken) return null
        useCustomerAuthStore.getState().setAccessToken(accessToken)
        return unwrap<Customer>(client.get('/storefront/customers/me'))
      },
      register: async (payload: CustomerRegisterPayload) => {
        const deviceId = await getDeviceId()
        const result = await unwrap<{ customer: Customer; accessToken: string; mobileRefreshToken?: string }>(
          client.post('/storefront/customers/auth/register', { ...payload, deviceId }),
        )
        return captureMobileRefreshToken(result)
      },
      login: async (payload: CustomerLoginPayload) => {
        const deviceId = await getDeviceId()
        const result = await unwrap<{ customer: Customer; accessToken: string; mobileRefreshToken?: string }>(
          client.post('/storefront/customers/auth/login', { ...payload, deviceId }),
        )
        return captureMobileRefreshToken(result)
      },
      logout: async () => {
        try {
          await client.post('/storefront/customers/auth/logout')
        } finally {
          // Same caveat as staff-api.ts's logout: no endpoint yet to revoke
          // a mobile refresh family server-side, so this at least stops the
          // device from using the stored one again.
          useCustomerAuthStore.getState().setRefreshToken(null)
        }
      },
      forgotPassword: (email: string) =>
        unwrap<{ sent: boolean }>(client.post('/storefront/customers/auth/forgot-password', { email })),
      resetPassword: (token: string, password: string) =>
        unwrap<{ reset: boolean }>(client.post('/storefront/customers/auth/reset-password', { token, password })),
    },
    me: {
      get: () => unwrap<Customer>(client.get('/storefront/customers/me')),
      orders: (params?: { page?: number; limit?: number }) =>
        unwrap<PaginatedResult<CustomerOrderSummary>>(client.get('/storefront/customers/orders', { params })),
      order: (id: string) => unwrap<CustomerOrderSummary>(client.get(`/storefront/customers/orders/${id}`)),
    },
    products: {
      list: (params?: { page?: number; limit?: number; categoryId?: string; search?: string }) =>
        unwrap<PaginatedResult<Product>>(client.get('/storefront/products', { params })),
      get: (id: string) => unwrap<Product>(client.get(`/storefront/products/${id}`)),
    },
    orders: {
      create: (payload: CreateOrderPayload) => unwrap<CreateOrderResult>(client.post('/storefront/orders', payload)),
      quote: (payload: { items: { productId: string; variantId?: string; quantity: number }[]; couponCode?: string; shippingId?: string }) =>
        unwrap<OrderQuote>(client.post('/storefront/orders/quote', payload)),
    },
  }
}

export type CustomerApi = ReturnType<typeof createCustomerApi>
