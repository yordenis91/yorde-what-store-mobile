import { useQuery } from '@tanstack/react-query'
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

export function useMyOrders(slug: string) {
  return useQuery({
    queryKey: ['my-orders', slug],
    queryFn: () => customerApi.me.orders({ limit: 30 }),
    enabled: !!slug,
  })
}

export function useMyOrder(slug: string, id: string) {
  return useQuery({
    queryKey: ['my-orders', slug, id],
    queryFn: () => customerApi.me.order(id),
    enabled: !!slug && !!id,
  })
}
