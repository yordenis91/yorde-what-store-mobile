import React from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Badge, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { useMyOrder } from '../../../../src/hooks/queries'

export default function MyOrderDetailScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()
  const { data: order, isLoading } = useMyOrder(slug, id)

  if (isLoading) return <Spinner fullScreen />
  if (!order) return <EmptyState title="Order not found" />

  return (
    <Screen scroll>
      <Text variant="title">#{order.orderNumber}</Text>
      <Badge label={order.status} tone="info" />
      <Card style={{ marginTop: 16, gap: 8 }}>
        {order.items.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>
              {item.quantity}× {item.productName}
              {item.variantName ? ` (${item.variantName})` : ''}
            </Text>
            <Text>
              {order.currency} {item.lineTotal}
            </Text>
          </View>
        ))}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text weight="semibold">Total</Text>
          <Text weight="semibold">
            {order.currency} {order.grandTotal}
          </Text>
        </View>
      </Card>
    </Screen>
  )
}
