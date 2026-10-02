import React from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Badge, Button, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney, useStaffAuthStore, type OrderStatus } from '@yws/shared'
import { useOrder, useUpdateOrderStatus } from '../../../src/hooks/queries'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'COMPLETED',
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const { data: order, isLoading } = useOrder(id)
  const updateStatus = useUpdateOrderStatus()

  if (isLoading) return <Spinner fullScreen />
  if (!order) return <EmptyState title="Order not found" />

  const nextStatus = NEXT_STATUS[order.status]

  return (
    <Screen scroll>
      <Text variant="title">#{order.orderNumber}</Text>
      <Badge label={order.status} tone="info" />
      <Card style={{ marginTop: 16, gap: 8 }}>
        <Text weight="semibold">Customer</Text>
        <Text>{order.customerName}</Text>
        {order.customerPhone ? <Text color="muted">{order.customerPhone}</Text> : null}
      </Card>
      <Card style={{ marginTop: 12, gap: 8 }}>
        <Text weight="semibold">Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>
              {item.quantity}× {item.productName}
              {item.variantName ? ` (${item.variantName})` : ''}
            </Text>
            <Text>{formatMoney(item.lineTotal, tenant)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text weight="semibold">Total</Text>
          <Text weight="semibold">{formatMoney(order.grandTotal, tenant)}</Text>
        </View>
      </Card>
      {nextStatus ? (
        <Button
          title={`Mark as ${nextStatus}`}
          onPress={() => updateStatus.mutate({ id: order.id, status: nextStatus })}
          loading={updateStatus.isPending}
          style={{ marginTop: 16 }}
        />
      ) : null}
    </Screen>
  )
}
