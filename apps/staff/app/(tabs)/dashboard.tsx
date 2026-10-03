import React, { useEffect, useState } from 'react'
import { Pressable, RefreshControl, Share, View } from 'react-native'
import { router } from 'expo-router'
import { Button, Card, Chip, EmptyState, Screen, Spinner, Text, useTheme } from '@yws/ui'
import {
  DASHBOARD_RANGES,
  formatMoney,
  orderStatusLabel,
  storefrontLink,
  useStaffAuthStore,
  type DashboardRange,
  type DashboardSummary,
} from '@yws/shared'
import { useDashboard } from '../../src/hooks/queries'
import { usePushRegistration } from '../../src/hooks/usePushRegistration'
import { useRefreshByUser } from '../../src/hooks/useRefreshByUser'
import { STOREFRONT_URL } from '../../src/lib/api'

const RANGE_LABEL: Record<DashboardRange, string> = { '7d': '7 días', '30d': '30 días', '90d': '90 días' }

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

/** Revenue per day as plain bars — enough to read the trend without a charting library. */
function RevenueBars({ points }: { points: DashboardSummary['revenueOverTime'] }) {
  const theme = useTheme()
  const max = Math.max(...points.map((p) => p.revenue), 0)
  if (max <= 0) return <Text color="muted">Sin ingresos en este período.</Text>
  return (
    <View
      accessible
      accessibilityLabel="Gráfico de ingresos por día"
      style={{ flexDirection: 'row', alignItems: 'flex-end', height: 96, gap: 2 }}
    >
      {points.map((p) => (
        <View
          key={p.date}
          style={{
            flex: 1,
            height: Math.max((p.revenue / max) * 96, p.revenue > 0 ? 3 : 1),
            backgroundColor: p.revenue > 0 ? theme.colors.brand500 : theme.colors.border,
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
          }}
        />
      ))}
    </View>
  )
}

export default function DashboardScreen() {
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const [range, setRange] = useState<DashboardRange>('7d')
  const { data, isLoading, isError, refetch } = useDashboard(range)
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

  const storeUrl = tenant ? storefrontLink(STOREFRONT_URL, tenant.slug) : null
  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text variant="title" style={{ marginBottom: 8 }}>
        {tenant?.name ?? 'Panel'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {DASHBOARD_RANGES.map((r) => (
          <Chip key={r} label={RANGE_LABEL[r]} selected={range === r} onPress={() => setRange(r)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Pedidos" value={data.periodOrders} />
        <Stat label="Ventas del período" value={formatMoney(data.periodRevenue, tenant)} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Ticket promedio" value={formatMoney(data.averageOrderValue, tenant)} />
        <Stat label="Pendientes" value={data.pendingOrders} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <Stat label="Visitantes" value={data.uniqueVisitors} />
        <Stat
          label="Conversión"
          value={data.conversionRate === null ? '—' : `${(data.conversionRate * 100).toFixed(1)}%`}
        />
      </View>

      <Card style={{ gap: 8, marginBottom: 12 }}>
        <Text weight="semibold">Ingresos por día</Text>
        <RevenueBars points={data.revenueOverTime} />
      </Card>

      <Card style={{ gap: 6, marginBottom: 12 }}>
        <Text weight="semibold">Pedidos recientes</Text>
        {data.recentOrders.length === 0 ? <Text color="muted">Todavía no hay pedidos.</Text> : null}
        {data.recentOrders.map((order) => (
          <Pressable key={order.id} onPress={() => router.push(`/(tabs)/orders/${order.id}`)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 12 }}>
              <Text style={{ flex: 1 }} numberOfLines={1}>
                #{order.orderNumber} · {order.customerName}
              </Text>
              <Text color="muted">{orderStatusLabel(order.status)}</Text>
            </View>
          </Pressable>
        ))}
      </Card>

      {data.topProducts.length > 0 ? (
        <Card style={{ gap: 6, marginBottom: 12 }}>
          <Text weight="semibold">Más vendidos</Text>
          {data.topProducts.map((p) => (
            <View key={p.productId ?? p.name} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flex: 1 }} numberOfLines={1}>
                {p.name}
              </Text>
              <Text color="muted">
                {p.quantitySold} u. · {formatMoney(p.revenue, tenant)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {data.couponPerformance.length > 0 ? (
        <Card style={{ gap: 6, marginBottom: 12 }}>
          <Text weight="semibold">Cupones</Text>
          {data.couponPerformance.map((c) => (
            <View key={c.code} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text>{c.code}</Text>
              <Text color="muted">
                {c.timesUsed} usos · −{formatMoney(c.discountGiven, tenant)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}

      {data.topReferrers.length > 0 ? (
        <Card style={{ gap: 6, marginBottom: 12 }}>
          <Text weight="semibold">De dónde llegan</Text>
          {data.topReferrers.map((r) => (
            <View key={r.referrer} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ flex: 1 }} numberOfLines={1}>
                {r.referrer}
              </Text>
              <Text color="muted">{r.sessions}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {storeUrl ? (
        <Card style={{ gap: 8 }}>
          <Text weight="semibold">Enlace de tu tienda</Text>
          <Text selectable color="muted">
            {storeUrl}
          </Text>
          <Button
            title="Compartir tienda"
            variant="secondary"
            onPress={() => Share.share({ message: `${tenant?.name}: ${storeUrl}`, url: storeUrl }).catch(() => undefined)}
          />
        </Card>
      ) : null}
    </Screen>
  )
}
