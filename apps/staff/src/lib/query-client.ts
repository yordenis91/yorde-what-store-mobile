import { QueryClient } from '@tanstack/react-query'
import { useStaffAuthStore } from '@yws/shared'
import './app-focus'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

// Every cached response belongs to one user in one store, and the query keys
// don't carry either — drop the whole cache when either changes (switching
// stores, logging out, or the session expiring) so the next screen can never
// render the previous store's orders or the previous user's customers.
useStaffAuthStore.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id || state.activeTenant?.id !== prev.activeTenant?.id) {
    queryClient.clear()
  }
})
