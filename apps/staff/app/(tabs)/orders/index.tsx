import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { Badge, Card, Chip, EmptyState, Input, Screen, Text, useTheme, type BadgeTone } from '@yws/ui'
import { formatDate, formatMoney, ORDER_STATUS_LABEL, useStaffAuthStore, type OrderStatus } from '@yws/shared'
import { useOrders } from '../../../src/hooks/queries'
import { useRefreshByUser } from '../../../src/hooks/useRefreshByUser'

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
}

const STATUS_FILTERS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']

export default function OrdersScreen() {
  const theme = useTheme()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | undefined>()
  const orders = useOrders({ search: search.trim() || undefined, status })
  const { refreshing, onRefresh } = useRefreshByUser(orders.refetch)
  const items = orders.data?.pages.flatMap((p) => p.items) ?? []

  // Scrolls with the list and stays mounted, so typing a search keeps focus.
  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <Text variant="title">Pedidos</Text>
      <Input placeholder="Buscar por número o cliente" value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Todos" selected={!status} onPress={() => setStatus(undefined)} />
        {STATUS_FILTERS.map((s) => (
          <Chip key={s} label={ORDER_STATUS_LABEL[s]} selected={status === s} onPress={() => setStatus(s)} />
        ))}
      </ScrollView>
    </View>
  )

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: 10, padding: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (orders.hasNextPage && !orders.isFetchingNextPage) void orders.fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          orders.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} color={theme.colors.brand600} />
          ) : (
            <EmptyState
              title={search || status ? 'No hay pedidos con esos filtros' : 'Todavía no hay pedidos'}
              description={search || status ? undefined : 'Los pedidos nuevos aparecen acá al instante.'}
            />
          )
        }
        ListFooterComponent={
          orders.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color={theme.colors.brand600} /> : null
        }
        renderItem={({ item }) => {
          // A Zelle screenshot waiting for someone to check it.
          const needsZelleReview = item.fulfillmentMethod === 'ZELLE' && item.paymentStatus !== 'PAID' && !!item.paymentProofUrl
          return (
            <Pressable onPress={() => router.push(`/(tabs)/orders/${item.id}`)}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <View style={{ gap: 2, flex: 1 }}>
                  <Text weight="semibold">#{item.orderNumber}</Text>
                  <Text color="muted" variant="caption" numberOfLines={1}>
                    {item.customerName} · {formatDate(item.createdAt)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text weight="semibold">{formatMoney(item.grandTotal, tenant)}</Text>
                  <Badge label={ORDER_STATUS_LABEL[item.status]} tone={STATUS_TONE[item.status]} />
                  {needsZelleReview ? <Badge label="Zelle: revisar pago" tone="warning" /> : null}
                </View>
              </Card>
            </Pressable>
          )
        }}
      />
    </Screen>
  )
}
