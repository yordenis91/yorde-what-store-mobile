import React from 'react'
import { FlatList, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, EmptyState, Screen, Text } from '@yws/ui'
import { formatMoney, useCartStore } from '@yws/shared'
import { useTenant } from '../../../../src/hooks/queries'

export default function CartScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: tenant } = useTenant(slug)
  const items = useCartStore((s) => s.items)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState title="Your cart is empty" actionLabel="Browse products" onAction={() => router.push(`/store/${slug}`)} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        Cart
      </Text>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.productId}-${i.variantId ?? ''}`}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text weight="semibold">{item.name}</Text>
              <Text color="muted" variant="caption">
                {formatMoney(item.unitPrice, tenant)} × {item.quantity}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <Button title="-" fullWidth={false} variant="secondary" onPress={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} />
              <Text>{item.quantity}</Text>
              <Button title="+" fullWidth={false} variant="secondary" onPress={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} />
              <Button title="✕" fullWidth={false} variant="ghost" onPress={() => removeItem(item.productId, item.variantId)} />
            </View>
          </Card>
        )}
      />
      <View style={{ marginTop: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text weight="semibold">Subtotal</Text>
          <Text weight="semibold">{formatMoney(total, tenant)}</Text>
        </View>
        <Button title="Checkout" onPress={() => router.push(`/store/${slug}/checkout`)} />
      </View>
    </Screen>
  )
}
