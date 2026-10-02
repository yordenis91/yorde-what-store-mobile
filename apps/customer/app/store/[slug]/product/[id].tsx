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
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === id && !i.variantId)?.quantity ?? 0)
  const [added, setAdded] = useState(false)

  if (isLoading) return <Spinner fullScreen />
  if (!product) return <EmptyState title="Producto no encontrado" />

  const cover = product.images.find((i) => i.isCover) ?? product.images[0]
  // Stock only limits the cart when the store tracks inventory — mirrors the web client.
  const stock = tenant?.tracksInventory ? product.quantity : undefined
  const soldOut = stock !== undefined && stock <= 0
  const allInCart = stock !== undefined && !soldOut && inCart >= stock

  function onAddToCart() {
    if (!product) return
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: Number.parseFloat(product.price),
      quantity: 1,
      imageUrl: cover?.url,
      maxQuantity: stock,
    })
    setAdded(true)
  }

  return (
    <Screen scroll>
      {cover ? <Image source={{ uri: cover.url }} style={{ width: '100%', height: 240, borderRadius: 12 }} resizeMode="cover" /> : null}
      <View style={{ marginTop: 16, gap: 8 }}>
        <Text variant="title">{product.name}</Text>
        <Text variant="subtitle">{formatMoney(product.price, tenant)}</Text>
        {product.description ? <Text color="muted">{product.description}</Text> : null}
      </View>
      <Button
        title={soldOut ? 'Agotado' : allInCart ? 'Ya tenés todo el stock en el carrito' : added ? 'Agregado al carrito' : 'Agregar al carrito'}
        onPress={onAddToCart}
        style={{ marginTop: 20 }}
        disabled={product.hasVariants || soldOut || allInCart}
      />
      {product.hasVariants ? (
        <Text color="muted" variant="caption" style={{ marginTop: 8, textAlign: 'center' }}>
          Este producto tiene opciones — todavía no se pueden elegir desde la app.
        </Text>
      ) : null}
      {added ? (
        <Button title="Ver carrito" variant="secondary" onPress={() => router.push(`/store/${slug}/cart`)} style={{ marginTop: 8 }} />
      ) : null}
    </Screen>
  )
}
