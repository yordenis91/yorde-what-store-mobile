import { onlineManager, QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { useCustomerAuthStore } from '@yws/shared'
import './app-focus'
import { PERSIST_MAX_AGE_MS } from './query-state'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Saved catalog data is restored on launch, and a query is dropped from
      // memory after gcTime — it must outlive the persisted copy or it vanishes.
      gcTime: PERSIST_MAX_AGE_MS,
      // Try the request even when the phone says it is offline: that flag is
      // often wrong on a weak link. Retries still wait until it is back.
      networkMode: 'offlineFirst',
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

// Lets React Query pause retries while offline and refetch on reconnect.
// `isConnected === false` only: null (still unknown) must not read as offline.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
)

/** Saves the public catalog (see `shouldPersistQuery`) on the phone so it opens with no connection. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'yws-customer-query-cache',
  // Writes are batched: one per burst of updates, not one per query.
  throttleTime: 2000,
})
