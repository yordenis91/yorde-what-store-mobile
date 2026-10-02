import { useMemo } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { CartItem } from '@yws/shared'
import { customerApi } from '../lib/api'

export function useTenant(slug: string) {
  return useQuery({
    queryKey: ['tenant', slug],
    queryFn: () => customerApi.tenant.bySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  })
}

export function useStorefrontProducts(slug: string, search?: string) {
  return useQuery({
    queryKey: ['storefront-products', slug, search],
    queryFn: () => customerApi.products.list({ search, limit: 30 }),
    enabled: !!slug,
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
    queryFn: () => customerApi.me.orders({ limit: 30 }),
    enabled: !!slug && signedIn,
  })
}

export function useMyOrder(slug: string, id: string) {
  return useQuery({
    queryKey: ['my-orders', slug, id],
    queryFn: () => customerApi.me.order(id),
    enabled: !!slug && !!id,
  })
}

/**
 * Server-priced totals for the cart — the same code that prices the order on
 * submit, so the total shown and the total charged are one number (mirrors
 * the web checkout). Also reports a rejected coupon (`couponError`) and lines
 * that exceed current stock (`stockIssues`).
 */
export function useCheckoutQuote(slug: string, items: CartItem[], couponCode: string | null) {
  const orderItems = useMemo(
    () => items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    [items],
  )
  return useQuery({
    queryKey: ['checkout-quote', slug, orderItems, couponCode],
    queryFn: () => customerApi.orders.quote({ items: orderItems, couponCode: couponCode ?? undefined }),
    enabled: !!slug && orderItems.length > 0,
    // Keep showing the last totals while a new coupon or quantity is priced.
    placeholderData: keepPreviousData,
  })
}
