/**
 * The api returns uploaded media (product images, tenant logo/banner) as
 * same-origin relative paths like `/uploads/<tenantId>/<file>` — mirrors
 * `yorde-what-store-client/src/services/api-client.ts`'s `resolveMediaUrl`.
 * An already-absolute URL (external hosting) passes through unchanged.
 */
export function resolveMediaUrl(url: string | null | undefined, apiUrl: string): string | null {
  if (!url) return null
  if (/^https?:\/\//.test(url)) return url
  const origin = apiUrl.replace(/\/api\/v1\/?$/, '')
  return `${origin}${url}`
}
