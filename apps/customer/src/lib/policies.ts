import type { PublicTenant } from '@yws/shared'

export type PolicyKey =
  'termsOfSaleContent' | 'shippingPolicyContent' | 'returnPolicyContent' | 'privacyPolicyContent'

/**
 * The merchant's own store policies, at the same paths as the web storefront
 * (`/store/<slug>/terms-of-sale`, …) so a shared web link opens the same page
 * in the app. Independent of Yorde What Store's own platform terms.
 */
export const STORE_POLICIES: { key: PolicyKey; path: string; title: string }[] = [
  { key: 'termsOfSaleContent', path: 'terms-of-sale', title: 'Términos de venta' },
  { key: 'shippingPolicyContent', path: 'shipping-policy', title: 'Política de envío' },
  { key: 'returnPolicyContent', path: 'return-policy', title: 'Política de devoluciones / reembolsos' },
  { key: 'privacyPolicyContent', path: 'privacy-policy', title: 'Política de privacidad' },
]

export function publishedPolicies(tenant: PublicTenant | undefined) {
  return STORE_POLICIES.filter((p) => !!tenant?.[p.key]?.trim())
}
