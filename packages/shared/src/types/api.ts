/**
 * Contract types mirrored from `yorde-what-store-client/src/types/api.ts`, which
 * itself mirrors the NestJS DTOs/entities in `yorde-what-store-api`. Kept as a
 * subset relevant to the mobile apps — extend from the source of truth
 * (the api repo) rather than guessing new fields.
 */

export interface ApiEnvelope<T> {
  success: true
  data: T
}

export interface PaginatedResult<T> {
  items: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

/** Mirrors the api's `DevicePlatform` Prisma enum (see `device_tokens`). */
export type DevicePlatform = 'IOS' | 'ANDROID'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  globalRole: 'SUPER_ADMIN' | 'USER'
  twoFactorEnabled: boolean
  isActive: boolean
}

export type TenantMemberRole = 'OWNER' | 'STAFF'
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'TRIAL_EXPIRED'

export interface Tenant {
  id: string
  ownerId: string
  name: string
  slug: string
  subdomain: string | null
  tagline: string | null
  about: string | null
  currency: string
  currencySymbol: string
  currencySymbolPosition: string
  locale: string
  logoUrl: string | null
  bannerUrl: string | null
  theme: string
  tracksInventory: boolean
  whatsappEnabled: boolean
  whatsappNumber: string | null
  socialLinks: Record<string, string>
  isActive: boolean
  status: TenantStatus
  createdAt: string
  myRole?: TenantMemberRole
}

/** Public projection of a tenant — served to unauthenticated storefront requests. */
export interface PublicTenant {
  id: string
  name: string
  slug: string
  tagline: string | null
  about: string | null
  logoUrl: string | null
  bannerUrl: string | null
  theme: string
  tracksInventory: boolean
  currency: string
  currencySymbol: string
  currencySymbolPosition: string
  locale: string
  socialLinks: Record<string, string>
  whatsappEnabled: boolean
  telegramEnabled: boolean
  termsOfSaleContent: string | null
  shippingPolicyContent: string | null
  returnPolicyContent: string | null
  privacyPolicyContent: string | null
  /**
   * The store's Zelle recipient — present only when the store has Zelle
   * enabled (absent otherwise), so its presence is what gates offering Zelle
   * at checkout. Public on purpose: it's what the customer needs to pay.
   */
  zellePaymentInfo?: ZellePaymentInfo | null
}

export interface ProductCategory {
  id: string
  name: string
  templateId?: string | null
}

export interface ProductTax {
  id: string
  name: string
  rate: string
}

export interface ProductVariant {
  id: string
  name: string
  sku: string | null
  price: string
  cost: string | null
  quantity: number
  locationId: string | null
}

export interface ProductImage {
  id: string
  url: string
  isCover: boolean
  sortOrder: number
}

export interface Product {
  id: string
  tenantId: string
  name: string
  sku: string | null
  description: string | null
  price: string
  /** "Before" price; a discount exists only when it is higher than `price`. */
  compareAtPrice: string | null
  cost: string | null
  quantity: number
  hasVariants: boolean
  isActive: boolean
  isPublished: boolean
  attributes: Record<string, unknown>
  categories: { category: ProductCategory }[]
  taxes: { tax: ProductTax }[]
  variants: ProductVariant[]
  images: ProductImage[]
  createdAt: string
}

export type FulfillmentMethod = 'WHATSAPP' | 'TELEGRAM' | 'STRIPE' | 'MERCADOPAGO' | 'ZELLE'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export interface OrderItem {
  id: string
  productId: string | null
  productName: string
  variantId: string | null
  variantName: string | null
  sku: string | null
  unitPrice: string
  quantity: number
  taxAmount: string
  lineTotal: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentMethod: FulfillmentMethod
  currency: string
  subtotal: string
  taxTotal: string
  discountTotal: string
  shippingTotal: string
  grandTotal: string
  fulfillmentMessage: string | null
  items: OrderItem[]
  createdAt: string
  invoiceAvailable?: boolean
  /** The delivery option chosen at checkout — null for pickup. */
  shipping?: { id: string; name: string; cost: string } | null
  /** Collected only for delivery (see ShippingAddress). */
  shippingAddress?: ShippingAddress | null
  /** Zelle only: the customer's uploaded proof and optional confirmation number. Cleared if the store rejects it. */
  paymentProofUrl?: string | null
  paymentReference?: string | null
}

/** An active delivery option from `GET /storefront/shipping`; not choosing one means picking up in store. */
export interface Shipping {
  id: string
  name: string
  cost: string
  locationId: string | null
  isActive: boolean
}

/** Free-form on the api (`shippingAddress` is any object); these are the fields the web checkout collects. */
export interface ShippingAddress {
  line1?: string
  line2?: string
  city?: string
  state?: string
  postalCode?: string
  notes?: string
}

export interface ZellePaymentInfo {
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  instructions?: string
}

/** `GET /storefront/orders/:id/public` — the invoice-style view of an order, readable by anyone holding its (random UUID) id. */
export interface PublicOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  fulfillmentMethod: FulfillmentMethod
  currency: string
  createdAt: string
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  shipping: { name: string; cost: string } | null
  subtotal: string
  taxTotal: string
  discountTotal: string
  shippingTotal: string
  grandTotal: string
  items: { id: string; productName: string; variantName: string | null; quantity: number; unitPrice: string; taxAmount: string; lineTotal: string }[]
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  createdAt: string
}

export interface CustomerOrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  fulfillmentMethod: FulfillmentMethod
  grandTotal: string
  currency: string
  createdAt: string
  items: { id: string; productName: string; variantName: string | null; quantity: number; lineTotal: string }[]
}

export type CustomerSegment = 'new' | 'recurring' | 'vip'

export interface CustomerListItem extends Customer {
  totalOrders: number
  totalSpent: number
  lastOrderAt: string | null
  segment: CustomerSegment
}

export interface CustomerDetail extends CustomerListItem {
  orders: CustomerOrderSummary[]
}

export const DASHBOARD_RANGES = ['7d', '30d', '90d'] as const
export type DashboardRange = (typeof DASHBOARD_RANGES)[number]

/** Mirrors `GET /dashboard/summary` exactly — see `yorde-what-store-client/src/services/dashboard.service.ts`. */
export interface DashboardSummary {
  range: DashboardRange
  totalProducts: number
  totalOrders: number
  pendingOrders: number
  lifetimeRevenue: number
  periodRevenue: number
  periodOrders: number
  averageOrderValue: number
  revenueOverTime: { date: string; orders: number; revenue: number }[]
  topProducts: { productId: string | null; name: string; quantitySold: number; revenue: number }[]
  couponPerformance: { code: string; timesUsed: number; discountGiven: number }[]
  recentOrders: {
    id: string
    orderNumber: string
    customerName: string
    status: string
    grandTotal: string
    createdAt: string
  }[]
  uniqueVisitors: number
  totalPageviews: number
  conversionRate: number | null
  visitsOverTime: { date: string; visitors: number; pageviews: number }[]
  topReferrers: { referrer: string; sessions: number }[]
}
