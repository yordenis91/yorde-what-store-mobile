import React, { useState } from 'react'
import { Image, Pressable, ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, EmptyState, Screen, Spinner, Text, useTheme } from '@yws/ui'
import { discountPercent, formatMoney, useCartStore, type ProductVariant } from '@yws/shared'
import { useStorefrontProduct, useTenant } from '../../../../src/hooks/queries'
import { mediaUrl } from '../../../../src/lib/api'

function VariantChip({
  variant,
  selected,
  soldOut,
  onSelect,
}: {
  variant: ProductVariant
  selected: boolean
  soldOut: boolean
  onSelect: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: soldOut }}
      disabled={soldOut}
      onPress={onSelect}
      style={{
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.brand600 : theme.colors.border,
        backgroundColor: selected ? theme.colors.brand50 : theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        opacity: soldOut ? 0.4 : 1,
      }}
    >
      <Text weight={selected ? 'semibold' : undefined}>{variant.name}</Text>
    </Pressable>
  )
}

export default function ProductDetailScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()
  const theme = useTheme()
  const { data: tenant } = useTenant(slug)
  const { data: product, isLoading } = useStorefrontProduct(slug, id)
  const addItem = useCartStore((s) => s.addItem)
  const [variantId, setVariantId] = useState<string | undefined>()
  const [activeImageId, setActiveImageId] = useState<string | undefined>()
  const [added, setAdded] = useState(false)
  const inCart = useCartStore((s) => s.items.find((i) => i.productId === id && i.variantId === variantId)?.quantity ?? 0)

  if (isLoading) return <Spinner fullScreen />
  if (!product) return <EmptyState title="Producto no encontrado" />

  // Mirrors the web product page: a variant must be picked before adding, and
  // its own price and stock replace the product's once it is.
  const hasVariants = product.hasVariants && product.variants.length > 0
  const variant = product.variants.find((v) => v.id === variantId)
  const needsVariant = hasVariants && !variant
  const price = variant?.price ?? product.price
  const percent = hasVariants ? null : discountPercent(product.price, product.compareAtPrice)

  // Quantities only mean stock when the store tracks inventory; otherwise they
  // sit at their default of 0 and would read as sold out everywhere.
  const tracksInventory = !!tenant?.tracksInventory
  const stock = variant ? variant.quantity : product.quantity
  const soldOut = tracksInventory && !needsVariant && stock <= 0
  const allInCart = tracksInventory && !needsVariant && !soldOut && inCart >= stock

  const cover = product.images.find((i) => i.isCover) ?? product.images[0]
  const activeImage = product.images.find((i) => i.id === activeImageId) ?? cover

  function onAddToCart() {
    if (!product || needsVariant) return
    addItem({
      productId: product.id,
      variantId: variant?.id,
      name: product.name,
      variantName: variant?.name,
      unitPrice: Number.parseFloat(price),
      quantity: 1,
      imageUrl: cover ? mediaUrl(cover.url) : undefined,
      maxQuantity: tracksInventory ? stock : undefined,
    })
    setAdded(true)
  }

  function onSelectVariant(next: string) {
    setVariantId(next)
    setAdded(false)
  }

  const buttonTitle = needsVariant
    ? 'Elegí una opción'
    : soldOut
      ? 'Agotado'
      : allInCart
        ? 'Ya tenés todo el stock en el carrito'
        : added
          ? 'Agregado al carrito'
          : 'Agregar al carrito'

  return (
    <Screen scroll>
      {activeImage ? (
        <Image
          source={{ uri: mediaUrl(activeImage.url) }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: theme.radius.lg }}
          resizeMode="cover"
        />
      ) : null}
      {product.images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
          {product.images.map((img) => (
            <Pressable key={img.id} onPress={() => setActiveImageId(img.id)} accessibilityRole="imagebutton">
              <Image
                source={{ uri: mediaUrl(img.url) }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: theme.radius.md,
                  borderWidth: 2,
                  borderColor: img.id === activeImage?.id ? theme.colors.brand600 : theme.colors.border,
                }}
              />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={{ marginTop: 16, gap: 8 }}>
        <Text variant="title">{product.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <Text variant="subtitle">{formatMoney(price, tenant)}</Text>
          {percent !== null && product.compareAtPrice ? (
            <>
              <Text color="muted" style={{ textDecorationLine: 'line-through' }}>
                {formatMoney(product.compareAtPrice, tenant)}
              </Text>
              <Text color="success" weight="semibold">
                −{percent}%
              </Text>
            </>
          ) : null}
        </View>
        {tracksInventory && !needsVariant ? (
          soldOut ? (
            <Text color="muted">Agotado</Text>
          ) : stock <= 5 ? (
            <Text color="danger">Quedan solo {stock}</Text>
          ) : (
            <Text color="success">En stock</Text>
          )
        ) : null}
        {product.description ? <Text color="muted">{product.description}</Text> : null}
      </View>

      {hasVariants ? (
        <View style={{ marginTop: 16, gap: 8 }}>
          <Text weight="semibold">Opciones</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {product.variants.map((v) => (
              <VariantChip
                key={v.id}
                variant={v}
                selected={v.id === variantId}
                soldOut={tracksInventory && v.quantity <= 0}
                onSelect={() => onSelectVariant(v.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Button
        title={buttonTitle}
        onPress={onAddToCart}
        style={{ marginTop: 20 }}
        disabled={needsVariant || soldOut || allInCart}
      />
      {added ? (
        <Button
          title="Ver carrito"
          variant="secondary"
          onPress={() => router.push(`/store/${slug}/cart`)}
          style={{ marginTop: 8 }}
        />
      ) : null}
    </Screen>
  )
}
