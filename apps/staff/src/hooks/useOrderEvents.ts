import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import EventSource from 'react-native-sse'
import { useQueryClient } from '@tanstack/react-query'
import { useStaffAuthStore } from '@yws/shared'
import { API_URL, staffApi } from '../lib/api'

/** What the api streams for each order event (OrdersService.toOrderEvent). */
export interface OrderEventPayload {
  id: string
  orderNumber: string
  customerName: string
  grandTotal: number
  currency: string
  status: string
}

type OrderEventType = 'order.created' | 'order.status_updated'

// Same cadence as the web admin's useOrderEvents: the stream is opened with
// the token current at connect time, so it's recreated before the 15-minute
// access token would expire under it.
const RECONNECT_INTERVAL_MS = 10 * 60 * 1000
const RETRY_AFTER_ERROR_MS = 5000

/**
 * Live order feed (`GET /orders/events`, SSE) while the app is in the
 * foreground, the app's counterpart to the web admin's useOrderEvents: it
 * refreshes the orders and dashboard queries and reports new orders through
 * `onNewOrder` — never fabricating order data itself. Closed in the
 * background (push notifications are the background channel, once the api
 * delivers them). React Native has no EventSource, so this uses
 * react-native-sse (pure JS over XMLHttpRequest), which also lets the token
 * travel in the Authorization header instead of the URL.
 */
export function useOrderEvents(onNewOrder: (order: OrderEventPayload) => void) {
  const queryClient = useQueryClient()
  const tenantId = useStaffAuthStore((s) => s.activeTenant?.id)
  const onNewOrderRef = useRef(onNewOrder)
  onNewOrderRef.current = onNewOrder

  useEffect(() => {
    if (!tenantId) return

    let source: EventSource<OrderEventType> | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectTimer: ReturnType<typeof setInterval> | null = null
    let active = AppState.currentState === 'active'
    let disposed = false

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    function close() {
      source?.removeAllEventListeners()
      source?.close()
      source = null
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
    }

    async function connect() {
      close()
      if (disposed || !active) return
      // Any non-auth request goes through the api client's refresh-on-401, so
      // this leaves a current access token in the store before it's used.
      await staffApi.tenants.current().catch(() => undefined)
      const token = useStaffAuthStore.getState().accessToken
      if (disposed || !active || !token) return

      const es = new EventSource<OrderEventType>(`${API_URL}/orders/events`, {
        headers: { Authorization: `Bearer ${token}`, 'X-Tenant-ID': tenantId! },
        pollingInterval: 0, // reconnection is handled here, with a fresh token
      })
      source = es
      // A (re)connect can miss whatever happened in the gap — refetch once.
      es.addEventListener('open', refresh)
      es.addEventListener('order.created', (event) => {
        refresh()
        try {
          if (event.data) onNewOrderRef.current(JSON.parse(event.data) as OrderEventPayload)
        } catch {
          // A malformed event is just a missed nudge; the refetch above still ran.
        }
      })
      es.addEventListener('order.status_updated', refresh)
      es.addEventListener('error', () => {
        close()
        if (!disposed && active) retryTimer = setTimeout(() => void connect(), RETRY_AFTER_ERROR_MS)
      })
    }

    void connect()
    reconnectTimer = setInterval(() => void connect(), RECONNECT_INTERVAL_MS)
    const subscription = AppState.addEventListener('change', (state) => {
      const nowActive = state === 'active'
      if (nowActive === active) return
      active = nowActive
      if (active) void connect()
      else close()
    })

    return () => {
      disposed = true
      close()
      if (reconnectTimer) clearInterval(reconnectTimer)
      subscription.remove()
    }
  }, [tenantId, queryClient])
}
