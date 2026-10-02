import React, { useEffect } from 'react'
import { RefreshControl, View } from 'react-native'
import { Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney, orderStatusLabel, useStaffAuthStore } from '@yws/shared'
import { useDashboard } from '../../src/hooks/queries'
import { usePushRegistration } from '../../src/hooks/usePushRegistration'
import { useRefreshByUser } from '../../src/hooks/useRefreshByUser'

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
  const { data, isLoading, isError, refetch } = useDashboard('7d')
  const { refreshing, onRefresh } = useRefreshByUser(refetch)
  const { promptIfNeeded } = usePushRegistration()

  useEffect(() => {
    if (data) promptIfNeeded(data.totalOrders)
  }, [data, promptIfNeeded])

  if (isLoading) return <Spinner fullScreen />
  if (isError || !data) {
    return (
      <Screen>
        <EmptyState
          title="No pudimos cargar el panel"
          description="Revisá tu conexión e intentá de nuevo."
          actionLabel="Intentar de nuevo"
          onAction={() => refetch()}
        />
      </Screen>
    )
  }

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text variant="title" style={{ marginBottom: 4 }}>
        {tenant?.name ?? 'Panel'}
      </Text>
      <Text color="muted" style={{ marginBottom: 16 }}>
        Últimos 7 días
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Pedidos" value={data.periodOrders} />
        <Stat label="Ingresos" value={formatMoney(data.periodRevenue, tenant)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Pedidos pendientes" value={data.pendingOrders} />
        <Stat label="Productos" value={data.totalProducts} />
      </View>
      <Card>
        <Text weight="semibold" style={{ marginBottom: 8 }}>
          Pedidos recientes
        </Text>
        {data.recentOrders.length === 0 ? (
          <Text color="muted">Todavía no hay pedidos.</Text>
        ) : (
          data.recentOrders.map((order) => (
            <View key={order.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text>#{order.orderNumber}</Text>
              <Text color="muted">{orderStatusLabel(order.status)}</Text>
            </View>
          ))
        )}
      </Card>
    </Screen>
  )
}
