import { z } from 'zod'
import type { ShippingAddress } from '../types/api'

const email = z.string().email('Ingresá un email válido')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresá tu contraseña'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const staffRegisterSchema = z.object({
  name: z.string().min(1, 'Ingresá tu nombre'),
  email,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  storeName: z.string().min(1, 'Ingresá el nombre de la tienda'),
  storeSlug: z
    .string()
    .min(3, 'Al menos 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
})
export type StaffRegisterFormValues = z.infer<typeof staffRegisterSchema>

export const customerRegisterSchema = z.object({
  name: z.string().min(1, 'Ingresá tu nombre'),
  email: email.optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})
export type CustomerRegisterFormValues = z.infer<typeof customerRegisterSchema>

/**
 * Parses what a customer types or pastes into a store slug. Pass the
 * deployment's storefront root domain (the web client's
 * `storefrontRootDomain`) when it's known: links on that domain are then read
 * exactly like the web does — only `<slug>.<root>` names a store, the root
 * itself and deeper subdomains don't.
 */
export function createStoreSlugSchema(rootDomain?: string | null) {
  const root = rootDomain?.trim().toLowerCase().replace(/^\.+/, '') || null
  return z
    .string()
    .trim()
    .min(1, 'Ingresá el nombre o el link de una tienda')
    .transform((value, ctx) => {
      const slug = extractStoreSlug(value.toLowerCase(), root)
      if (!slug) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Eso no parece el nombre ni el link de una tienda',
        })
        return z.NEVER
      }
      return slug
    })
}

/** `createStoreSlugSchema` without a known root domain. */
export const storeSlugSchema = createStoreSlugSchema()

/** Subdomains that belong to the platform and never name a store — mirrors the web client's `RESERVED_SUBDOMAINS`. */
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'panel', 'static', 'cdn', 'mail'])

const SLUG = /^[a-z0-9-]+$/

/**
 * Accepts a bare slug, a `/store/<slug>` link (web fallback mode, or a
 * `ywstore://store/<slug>` deep link), or a store-subdomain link
 * (`https://<slug>.<root domain>/…`, what the web admin shares when subdomains
 * are on). On the known root domain this mirrors the web client's
 * `resolveTenantFromHost`; for any other host — or with no root configured —
 * it falls back to the api's TenantMiddleware rule (first label of a 3+ label
 * host), and a wrong guess just fails the tenant lookup that follows.
 */
function extractStoreSlug(input: string, root: string | null): string | null {
  const pathMatch = input.match(/(?:^|\/)store\/([^/?#]+)/)
  if (pathMatch) return SLUG.test(pathMatch[1]!) ? pathMatch[1]! : null

  if (SLUG.test(input)) return input

  const host = input.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#:]/)[0]!
  const isStoreLabel = (label: string) => SLUG.test(label) && !RESERVED_SUBDOMAINS.has(label)

  if (root && (host === root || host.endsWith(`.${root}`))) {
    const prefix = host.slice(0, -(root.length + 1))
    return prefix && !prefix.includes('.') && isStoreLabel(prefix) ? prefix : null
  }

  const labels = host.split('.')
  return labels.length >= 3 && isStoreLabel(labels[0]!) ? labels[0]! : null
}

/**
 * Why a delivery address can't be sent yet, or null when it can. Same rule as
 * the web checkout: only street and city are required (and only for delivery
 * — pickup needs no address at all).
 */
export function deliveryAddressError(address: ShippingAddress): string | null {
  if ((address.line1 ?? '').trim().length < 4) return 'Ingresá la calle y el número'
  if ((address.city ?? '').trim().length < 2) return 'Ingresá la ciudad'
  return null
}

/** Trims every field and drops the empty ones, so optional fields left blank aren't sent as "". */
export function cleanShippingAddress(address: ShippingAddress): ShippingAddress {
  return Object.fromEntries(
    Object.entries(address)
      .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value),
  ) as ShippingAddress
}
