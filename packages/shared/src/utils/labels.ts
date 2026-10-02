import type { CustomerSegment, OrderStatus, TenantMemberRole } from '../types/api'

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
