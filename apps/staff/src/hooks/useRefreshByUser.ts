import { useCallback, useState } from 'react'

/**
 * Pull-to-refresh state that only reflects refreshes the user asked for —
 * React Query's own `isRefetching` also flips on background refetches
 * (focus, invalidation), which would flash the spinner unprompted.
 */
export function useRefreshByUser(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])
  return { refreshing, onRefresh }
}
