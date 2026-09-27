import React from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { Badge, Card, EmptyState, Screen, Spinner, Text, type BadgeTone } from '@yws/ui'
import { formatMoney, useStaffAuthStore, type OrderStatus } from '@yws/shared'
import { useOrders } from '../../../src/hooks/queries'

const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PROCESSING: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
}

export default function OrdersScreen() {
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const { data, isLoading } = useOrders()

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        Orders
      </Text>
      {isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ gap: 10 }}
          ListEmptyComponent={<EmptyState title="No orders yet" description="New orders will show up here in real time." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(tabs)/orders/${item.id}`)}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ gap: 2 }}>
                  <Text weight="semibold">#{item.orderNumber}</Text>
                  <Text color="muted" variant="caption">
                    {item.customerName}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text weight="semibold">{tenant ? formatMoney(item.grandTotal, tenant) : item.grandTotal}</Text>
                  <Badge label={item.status} tone={STATUS_TONE[item.status]} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}
