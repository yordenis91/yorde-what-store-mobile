import type { PublicTenant, Tenant } from '../types/api'

type CurrencyTenant = Pick<Tenant | PublicTenant, 'currencySymbol' | 'currencySymbolPosition'>

/**
 * Prices arrive as decimal strings (Prisma `Decimal` serialized over JSON) —
 * never coerce with `+price` in a total, only for display, and always through
 * this helper so symbol placement matches the tenant's own setting instead of
 * a hardcoded '$'.
 *
 * `currencySymbolPosition` is `'pre'` (the api's default) or `'post'` — see
 * the api's Prisma schema and the web client's `formatMoney`. Pass the
 * tenant even while it's still loading: until it arrives the amount is shown
 * without a symbol, but still with two decimals.
 */
export function formatMoney(amount: string | number, tenant: CurrencyTenant | null | undefined): string {
  const value = typeof amount === 'string' ? Number.parseFloat(amount) : amount
  const formatted = Number.isFinite(value) ? value.toFixed(2) : '0.00'
  if (!tenant) return formatted
  return tenant.currencySymbolPosition === 'post' ? `${formatted}${tenant.currencySymbol}` : `${tenant.currencySymbol}${formatted}`
}

/** Whole-percent discount when `compareAt` is a real "before" price above `price`, else null — mirrors the web client's helper. */
export function discountPercent(price: string | number, compareAt: string | number | null | undefined): number | null {
  const now = Number(price)
  const before = Number(compareAt)
  if (!compareAt || !(before > now) || !(before > 0)) return null
  return Math.round(((before - now) / before) * 100)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
