import React, { useState } from 'react'
import { Image, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney, useCartStore } from '@yws/shared'
import { useStorefrontProduct, useTenant } from '../../../../src/hooks/queries'

export default function ProductDetailScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()
  const { data: tenant } = useTenant(slug)
  const { data: product, isLoading } = useStorefrontProduct(slug, id)
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)

  if (isLoading) return <Spinner fullScreen />
  if (!product) return <EmptyState title="Product not found" />

  const cover = product.images.find((i) => i.isCover) ?? product.images[0]

  function onAddToCart() {
    if (!product) return
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: Number.parseFloat(product.price),
      quantity: 1,
      imageUrl: cover?.url,
      maxQuantity: product.quantity || undefined,
    })
    setAdded(true)
  }

  return (
    <Screen scroll>
      {cover ? <Image source={{ uri: cover.url }} style={{ width: '100%', height: 240, borderRadius: 12 }} resizeMode="cover" /> : null}
      <View style={{ marginTop: 16, gap: 8 }}>
        <Text variant="title">{product.name}</Text>
        <Text variant="subtitle">{tenant ? formatMoney(product.price, tenant) : product.price}</Text>
        {product.description ? <Text color="muted">{product.description}</Text> : null}
      </View>
      <Button
        title={added ? 'Added to cart' : 'Add to cart'}
        onPress={onAddToCart}
        style={{ marginTop: 20 }}
        disabled={product.hasVariants}
      />
      {product.hasVariants ? (
        <Text color="muted" variant="caption" style={{ marginTop: 8, textAlign: 'center' }}>
          This product has options — variant selection isn't implemented yet.
        </Text>
      ) : null}
      {added ? (
        <Button title="View cart" variant="secondary" onPress={() => router.push(`/store/${slug}/cart`)} style={{ marginTop: 8 }} />
      ) : null}
    </Screen>
  )
}
