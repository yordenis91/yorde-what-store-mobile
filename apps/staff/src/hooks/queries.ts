import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  mergeTenant,
  useStaffAuthStore,
  type CustomerSegment,
  type DashboardRange,
  type OrderListParams,
  type OrderStatus,
  type PaginatedResult,
  type PickedImage,
  type ProductQuickEdit,
  type TenantSettingsUpdate,
  type UpsertPaymentSetting,
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

// --- Store settings ---------------------------------------------------------
// Keys: 'tenant' for the store's own settings, so one
// invalidateQueries({ queryKey: ['tenant'] }) refreshes every settings
// section after a save.

/**
 * Whether the signed-in user owns the active store. The settings endpoints
 * are `@Roles('OWNER')`, so this is what every section checks before showing
 * an editable form or firing an owner-only query — a collaborator gets the
 * read-only view instead of a 403 after filling it in.
 */
export function useIsStoreOwner() {
  return useStaffAuthStore((s) => s.activeTenant?.myRole === 'OWNER')
}

/** The active store's settings. Readable by owners and collaborators alike. */
export function useStoreSettings() {
  return useQuery({ queryKey: ['tenant', 'current'], queryFn: () => staffApi.tenants.current() })
}

/** Effective plan limits, to flag a channel the plan doesn't include before the api refuses to switch it on. */
export function usePlanEntitlements() {
  return useQuery({ queryKey: ['plan-entitlements'], queryFn: () => staffApi.plans.entitlements() })
}

/**
 * Saves one section's fields. On success the session's `activeTenant` is
 * refreshed through `mergeTenant` (which keeps `myRole`, absent from the
 * response) so the store name and currency symbol change everywhere at once.
 */
export function useUpdateStoreSettings() {
  const queryClient = useQueryClient()
  const setActiveTenant = useStaffAuthStore((s) => s.setActiveTenant)
  return useMutation({
    mutationFn: (changes: TenantSettingsUpdate) => staffApi.tenants.update(changes),
    onSuccess: (updated) => {
      setActiveTenant(mergeTenant(useStaffAuthStore.getState().activeTenant, updated))
      void queryClient.invalidateQueries({ queryKey: ['tenant'] })
    },
  })
}

/** Which payment providers are on. Owner-only endpoint, so the query stays idle for a collaborator. */
export function usePaymentSettings() {
  const isOwner = useIsStoreOwner()
  return useQuery({
    queryKey: ['tenant', 'payment-settings'],
    queryFn: () => staffApi.tenants.listPaymentSettings(),
    enabled: isOwner,
  })
}

export function useUpsertPaymentSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpsertPaymentSetting) => staffApi.tenants.upsertPaymentSetting(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tenant'] })
      void queryClient.invalidateQueries({ queryKey: ['storefront'] })
    },
  })
}

/**
 * The store's current Zelle recipient, read from the public storefront
 * projection — the one place the api exposes it, on purpose, because the
 * customer needs it to pay. It lets the payments screen prefill those fields
 * so editing the instructions doesn't blank the recipient (the api replaces
 * the whole credentials blob on save). Null while Zelle is off or outside the
 * plan, which is also exactly when there is nothing to preserve.
 */
export function useZelleRecipient(slug: string | undefined) {
  const isOwner = useIsStoreOwner()
  return useQuery({
    queryKey: ['storefront', slug],
    queryFn: () => staffApi.tenants.storefront(slug!),
    enabled: isOwner && !!slug,
    select: (tenant) => tenant.zellePaymentInfo ?? null,
  })
}

/** Uploads a store image and resolves its `/uploads/...` path; the caller sends that path in a settings save. */
export function useUploadStoreImage() {
  return useMutation({
    mutationFn: ({ image, type }: { image: PickedImage; type?: 'logo' | 'banner' | 'product' }) =>
      staffApi.tenants.uploadImage(image, type),
  })
}
