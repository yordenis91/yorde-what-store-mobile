import { QueryClient } from '@tanstack/react-query'
import { useCustomerAuthStore } from '@yws/shared'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

// Catalog queries are keyed by store slug and safe to keep, but `my-orders`
// belongs to whoever is signed in — drop it when the customer changes
// (logout, a different account, or the session expiring).
useCustomerAuthStore.subscribe((state, prev) => {
  if (state.customer?.id !== prev.customer?.id) {
    queryClient.removeQueries({ queryKey: ['my-orders'] })
  }
})
