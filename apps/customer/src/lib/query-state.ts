/** Query keys whose data is safe to keep on the phone and show again with no connection. */
const PERSISTED_ROOTS = new Set(['tenant', 'storefront-categories', 'storefront-products', 'storefront-shipping'])

/** How long saved catalog data stays usable. Also the in-memory gcTime floor: persisted queries must outlive it. */
export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Whether a query is kept in the on-device cache. Only the public catalog:
 * orders, quotes and anything tied to a signed-in customer never are. Product
 * list queries are keyed `['storefront-products', slug, 'list', search, …]`,
 * and a typed search is skipped so the cache doesn't fill up with one entry
 * per keystroke.
 */
export function shouldPersistQuery(queryKey: readonly unknown[], status: string): boolean {
  if (status !== 'success') return false
  const [root, , kind, search] = queryKey
  if (typeof root !== 'string' || !PERSISTED_ROOTS.has(root)) return false
  if (root === 'storefront-products' && kind === 'list' && search) return false
  return true
}

/**
 * Whether a query has failed to load for lack of an answer. With no
 * connection React Query doesn't error: the fetch (or its retry) pauses and
 * the query stays `pending`, so `isError` alone would leave a spinner forever.
 */
export function isLoadFailure(query: { isError: boolean; isPending: boolean; fetchStatus: string }): boolean {
  return query.isError || (query.isPending && query.fetchStatus === 'paused')
}
