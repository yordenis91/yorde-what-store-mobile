import React from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Badge, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney, ORDER_STATUS_LABEL } from '@yws/shared'
import { useMyOrder, useTenant } from '../../../../src/hooks/queries'

export default function MyOrderDetailScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()
  const { data: tenant } = useTenant(slug)
  const { data: order, isLoading } = useMyOrder(slug, id)

  if (isLoading) return <Spinner fullScreen />
  if (!order) return <EmptyState title="Pedido no encontrado" />

  return (
    <Screen scroll>
      <Text variant="title">#{order.orderNumber}</Text>
      <Badge label={ORDER_STATUS_LABEL[order.status]} tone="info" />
      <Card style={{ marginTop: 16, gap: 8 }}>
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
    </Screen>
  )
}
