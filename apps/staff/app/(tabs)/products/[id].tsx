import React from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Badge, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney, useStaffAuthStore } from '@yws/shared'
import { useProduct } from '../../../src/hooks/queries'

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const { data: product, isLoading } = useProduct(id)

  if (isLoading) return <Spinner fullScreen />
  if (!product) return <EmptyState title="Product not found" />

  return (
    <Screen scroll>
      <Text variant="title">{product.name}</Text>
      <Text color="muted" style={{ marginBottom: 12 }}>
        {product.sku ?? 'No SKU'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Badge label={product.isPublished ? 'Published' : 'Draft'} tone={product.isPublished ? 'success' : 'neutral'} />
        <Badge label={product.isActive ? 'Active' : 'Inactive'} tone={product.isActive ? 'info' : 'danger'} />
      </View>
      <Card style={{ gap: 8, marginBottom: 12 }}>
        <Text weight="semibold">Price &amp; stock</Text>
        <Text>{tenant ? formatMoney(product.price, tenant) : product.price}</Text>
        <Text color="muted">{product.hasVariants ? `${product.variants.length} variants` : `Quantity: ${product.quantity}`}</Text>
      </Card>
      {product.description ? (
        <Card style={{ gap: 4 }}>
          <Text weight="semibold">Description</Text>
          <Text color="muted">{product.description}</Text>
        </Card>
      ) : null}
    </Screen>
  )
}
