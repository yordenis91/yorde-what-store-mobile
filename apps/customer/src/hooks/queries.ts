import { useMemo } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { CartItem, ProductSort } from '@yws/shared'
import { customerApi } from '../lib/api'

export function useTenant(slug: string) {
  return useQuery({
    queryKey: ['tenant', slug],
    queryFn: () => customerApi.tenant.bySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}

const CATALOG_PAGE_SIZE = 20

/** The store's catalog, a page at a time — `fetchNextPage` as the list nears its end (the api caps a page at 100). */
export function useStorefrontProducts(
  slug: string,
  filters: { search?: string; categoryId?: string; sort: ProductSort },
) {
  const { search, categoryId, sort } = filters
  return useInfiniteQuery({
    queryKey: ['storefront-products', slug, 'list', search, categoryId, sort],
    queryFn: ({ pageParam }) =>
      customerApi.products.list({ search, categoryId, sort, page: pageParam, limit: CATALOG_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled: !!slug,
    // Keep the current results on screen while a new search/filter loads.
    placeholderData: keepPreviousData,
  })
}

export function useStorefrontProduct(slug: string, id: string) {
  return useQuery({
    queryKey: ['storefront-products', slug, id],
    queryFn: () => customerApi.products.get(id),
    enabled: !!slug && !!id,
  })
}

/** `signedIn` gates the request — without a session it can only 401 and trigger a pointless refresh. */
export function useMyOrders(slug: string, signedIn: boolean) {
  return useQuery({
    queryKey: ['my-orders', slug],
    queryFn: () => customerApi.me.orders(),
    enabled: !!slug && signedIn,
  })
}

/**
 * Server-priced totals for the cart — the same code that prices the order on
 * submit, so the total shown and the total charged are one number (mirrors
 * the web checkout). Also reports a rejected coupon (`couponError`) and lines
 * that exceed current stock (`stockIssues`).
 */
export function useCheckoutQuote(
  slug: string,
  items: CartItem[],
  couponCode: string | null,
  shippingId: string | null,
) {
  const orderItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    [items],
  )
  return useQuery({
    queryKey: ['checkout-quote', slug, orderItems, couponCode, shippingId],
    queryFn: () =>
      customerApi.orders.quote({
        items: orderItems,
        couponCode: couponCode ?? undefined,
        shippingId: shippingId ?? undefined,
      }),
    enabled: !!slug && orderItems.length > 0,
    // Keep showing the last totals while a new coupon or quantity is priced.
    placeholderData: keepPreviousData,
  })
}

/** The store's active delivery options; empty means pickup only. */
export function useStorefrontShippings(slug: string) {
  return useQuery({
    queryKey: ['storefront-shipping', slug],
    queryFn: () => customerApi.shipping.list(),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}

export function useStorefrontCategories(slug: string) {
  return useQuery({
    queryKey: ['storefront-categories', slug],
    queryFn: () => customerApi.categories.list(),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}
