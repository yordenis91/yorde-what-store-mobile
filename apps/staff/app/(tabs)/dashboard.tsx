import React, { useEffect } from 'react'
import { View } from 'react-native'
import { Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'
import { useDashboard } from '../../src/hooks/queries'
import { usePushRegistration } from '../../src/hooks/usePushRegistration'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text color="muted" variant="caption">
        {label}
      </Text>
      <Text variant="subtitle">{value}</Text>
    </Card>
  )
}

export default function DashboardScreen() {
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const { data, isLoading, isError } = useDashboard('7d')
  const { promptIfNeeded } = usePushRegistration()

  useEffect(() => {
    if (data) promptIfNeeded(data.totalOrders)
  }, [data, promptIfNeeded])

  if (isLoading) return <Spinner fullScreen />
  if (isError || !data) return <EmptyState title="Couldn't load your dashboard" description="Pull to refresh, or check your connection." />

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: 4 }}>
        {tenant?.name ?? 'Dashboard'}
      </Text>
      <Text color="muted" style={{ marginBottom: 16 }}>
        Last 7 days
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Orders" value={data.periodOrders} />
        <Stat label="Revenue" value={`${tenant?.currencySymbol ?? ''}${data.periodRevenue.toFixed(2)}`} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Pending orders" value={data.pendingOrders} />
        <Stat label="Products" value={data.totalProducts} />
      </View>
      <Card>
        <Text weight="semibold" style={{ marginBottom: 8 }}>
          Recent orders
        </Text>
        {data.recentOrders.length === 0 ? (
          <Text color="muted">No orders yet.</Text>
        ) : (
          data.recentOrders.map((order) => (
            <View key={order.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text>#{order.orderNumber}</Text>
              <Text color="muted">{order.status}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  )
}
