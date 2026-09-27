import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DashboardRange } from '@yws/shared'
import { staffApi } from '../lib/api'

export function useDashboard(range: DashboardRange = '7d') {
  return useQuery({ queryKey: ['dashboard', range], queryFn: () => staffApi.dashboard.summary(range) })
}

export function useProducts(search?: string) {
  return useQuery({ queryKey: ['products', search], queryFn: () => staffApi.products.list({ search, limit: 30 }) })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ['products', id], queryFn: () => staffApi.products.get(id), enabled: !!id })
}

export function useOrders(status?: string) {
  return useQuery({ queryKey: ['orders', status], queryFn: () => staffApi.orders.list({ status, limit: 30 }) })
}

export function useOrder(id: string) {
  return useQuery({ queryKey: ['orders', id], queryFn: () => staffApi.orders.get(id), enabled: !!id })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => staffApi.orders.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] })
    },
  })
}

export function useCustomers(search?: string) {
  return useQuery({ queryKey: ['customers', search], queryFn: () => staffApi.customers.list({ search, limit: 30 }) })
}
