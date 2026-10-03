const ORIGIN = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i

/**
 * The web storefront's base URL: the configured one when set, else the api's
 * origin (in production the web and the api share a domain).
 */
export function resolveStorefrontBaseUrl(configured: unknown, apiBaseUrl: string): string {
  const base =
    typeof configured === 'string' && configured.trim()
      ? configured.trim()
      : (apiBaseUrl.match(ORIGIN)?.[0] ?? '')
  return base.replace(/\/+$/, '')
}

/**
 * A web storefront link in its `/store/<slug>` form — the one the web serves
 * with or without per-store subdomains, and the one the customer app claims
 * through Android App Links, so it opens the app where it's installed.
 */
export function storefrontLink(baseUrl: string, storeSlug: string, subpath = ''): string {
  return `${baseUrl}/store/${encodeURIComponent(storeSlug)}${subpath}`
}

/** The order's public, invoice-style page — what the customer sees after ordering, shareable by the store. */
export function publicOrderLink(baseUrl: string, storeSlug: string, orderId: string): string {
  return storefrontLink(baseUrl, storeSlug, `/order/${orderId}`)
}
