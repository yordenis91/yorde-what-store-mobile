import type {
  CustomerSegment,
  FulfillmentMethod,
  OrderStatus,
  PaymentStatus,
  TenantMemberRole,
} from '../types/api'

/**
 * Display labels for the api's enum codes. The codes themselves (and every
 * type mirroring the api) stay in English — only what's rendered changes.
 */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PROCESSING: 'En preparación',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
}

export const FULFILLMENT_METHOD_LABEL: Record<FulfillmentMethod, string> = {
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  STRIPE: 'Tarjeta (Stripe)',
  MERCADOPAGO: 'MercadoPago',
  ZELLE: 'Zelle',
}

export const CUSTOMER_SEGMENT_LABEL: Record<CustomerSegment, string> = {
  new: 'Nuevo',
  recurring: 'Recurrente',
  vip: 'VIP',
}

export const TENANT_ROLE_LABEL: Record<TenantMemberRole, string> = {
  OWNER: 'Dueño',
  STAFF: 'Colaborador',
}

/** For api strings typed loosely (e.g. the dashboard's `recentOrders[].status`): falls back to the raw code. */
export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status as OrderStatus] ?? status
}

/**
 * Social networks a store can link to, in the order the storefront header and
 * the settings form render them. Mirrors the web admin's `config/social.ts`
 * (minus its icon components, which are web-only) — `Tenant.socialLinks` is a
 * free-form JSON object, so a key that isn't here is simply not editable from
 * the app and is left untouched on save.
 */
export const SOCIAL_NETWORKS = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tutienda' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tutienda' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/15551234567' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@tutienda' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@tutienda' },
  { key: 'x', label: 'X', placeholder: 'https://x.com/tutienda' },
  { key: 'website', label: 'Sitio web', placeholder: 'https://tutienda.com' },
] as const

export type SocialNetworkKey = (typeof SOCIAL_NETWORKS)[number]['key']

/** Storefront theme names, as the web settings page labels them. */
export const STOREFRONT_THEME_LABEL: Record<string, string> = {
  default: 'Azul',
  emerald: 'Esmeralda',
  teal: 'Turquesa',
  violet: 'Violeta',
  rose: 'Rosa',
  orange: 'Naranja',
  amber: 'Ámbar',
  slate: 'Pizarra',
}
