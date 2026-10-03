import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CustomerSegment,
  DashboardRange,
  OrderListParams,
  OrderStatus,
  PaginatedResult,
  PickedImage,
  ProductQuickEdit,
} from '@yws/shared'
import { staffApi } from '../lib/api'

const PAGE_SIZE = 20

/** Next page number for an infinite list, or undefined on the last page. */
function nextPage(last: PaginatedResult<unknown>) {
  return last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined
}

// Keys: every order query starts with 'orders' ('list' | 'detail'), so one
// invalidateQueries({ queryKey: ['orders'] }) — what the live feed and every
// mutation do — refreshes lists and details alike.

export function useDashboard(range: DashboardRange = '7d') {
  return useQuery({ queryKey: ['dashboard', range], queryFn: () => staffApi.dashboard.summary(range) })
}

export function useOrders(filters: Omit<OrderListParams, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['orders', 'list', filters],
    queryFn: ({ pageParam }) => staffApi.orders.list({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    placeholderData: keepPreviousData,
  })
}

export function useOrder(id: string) {
  return useQuery({ queryKey: ['orders', 'detail', id], queryFn: () => staffApi.orders.get(id), enabled: !!id })
}

function useOrderMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateOrderStatus() {
  return useOrderMutation(({ id, status }: { id: string; status: OrderStatus }) =>
    staffApi.orders.updateStatus(id, status),
  )
}

export function useConfirmZellePayment() {
  return useOrderMutation((id: string) => staffApi.orders.confirmZellePayment(id))
}

export function useRejectZellePayment() {
  return useOrderMutation((id: string) => staffApi.orders.rejectZellePayment(id))
}

export function useProducts(search?: string) {
  return useInfiniteQuery({
    queryKey: ['products', 'list', search],
    queryFn: ({ pageParam }) => staffApi.products.list({ search, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: string) {
  return useQuery({ queryKey: ['products', 'detail', id], queryFn: () => staffApi.products.get(id), enabled: !!id })
}

function useProductMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct(id: string) {
  return useProductMutation((changes: ProductQuickEdit) => staffApi.products.update(id, changes))
}

export function useAddProductImage(id: string) {
  return useProductMutation(({ image, isCover }: { image: PickedImage; isCover?: boolean }) =>
    staffApi.products.addImage(id, image, { isCover }),
  )
}

export function useRemoveProductImage(id: string) {
  return useProductMutation((imageId: string) => staffApi.products.removeImage(id, imageId))
}

export function useSetCoverImage(id: string) {
  return useProductMutation((imageId: string) => staffApi.products.setCoverImage(id, imageId))
}

export function useCustomers(filters: { search?: string; segment?: CustomerSegment }) {
  return useInfiniteQuery({
    queryKey: ['customers', 'list', filters],
    queryFn: ({ pageParam }) => staffApi.customers.list({ ...filters, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: ['customers', 'detail', id], queryFn: () => staffApi.customers.get(id), enabled: !!id })
}
