import { z } from 'zod'

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

export const storeSlugSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá el nombre o el link de una tienda')
  .transform((value, ctx) => {
    const slug = extractStoreSlug(value.toLowerCase())
    if (!slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Eso no parece el nombre ni el link de una tienda',
      })
      return z.NEVER
    }
    return slug
  })

/** Subdomains that belong to the platform and never name a store — mirrors the web client's `RESERVED_SUBDOMAINS`. */
const RESERVED_SUBDOMAINS = new Set(['www', 'api', 'admin', 'app', 'panel', 'static', 'cdn', 'mail'])

const SLUG = /^[a-z0-9-]+$/

/**
 * Accepts a bare slug, a `/store/<slug>` link (web fallback mode, or a
 * `ywstore://store/<slug>` deep link), or a store-subdomain link
 * (`https://<slug>.<root domain>/…`, what the web admin shares when subdomains
 * are on). The root domain is deployment config, so — like the api's
 * TenantMiddleware — any host with 3+ labels is read as `<slug>.<root>`;
 * a wrong guess just fails the tenant lookup that follows.
 */
function extractStoreSlug(input: string): string | null {
  const pathMatch = input.match(/(?:^|\/)store\/([^/?#]+)/)
  if (pathMatch) return SLUG.test(pathMatch[1]!) ? pathMatch[1]! : null

  if (SLUG.test(input)) return input

  const host = input.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').split(/[/?#:]/)[0]!
  const labels = host.split('.')
  const sub = labels[0]!
  if (labels.length >= 3 && SLUG.test(sub) && !RESERVED_SUBDOMAINS.has(sub)) return sub
  return null
}
