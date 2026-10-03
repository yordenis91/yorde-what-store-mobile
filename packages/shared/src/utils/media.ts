/**
 * Builds the resolver for media URLs the api returns relative to its own
 * origin (`/uploads/<tenant>/<file>.webp`). React Native's `<Image>` needs an
 * absolute URL — unlike the web client, which resolves the same paths against
 * its origin (its `resolveMediaUrl`). The api serves `/uploads` itself, and in
 * production the web's nginx proxies it on the same domain, so the api's
 * origin works in both cases.
 *
 * Parsed by hand: React Native's `URL` doesn't implement `origin`.
 */
export function createMediaUrlResolver(apiBaseUrl: string): (url: string) => string {
  const origin = apiBaseUrl.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i)?.[0] ?? ''
  return (url) =>
    /^[a-z][a-z0-9+.-]*:/i.test(url) || !origin ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`
}
