import React, { useRef, useState } from 'react'
import { Animated, Image, Platform, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Badge, Text, useTheme } from '@yws/ui'
import { formatMoney, useCartStore, type Product, type PublicTenant } from '@yws/shared'

const NEW_WINDOW_DAYS = 7

/**
 * One tap adds the base product straight to the cart — there's no variant
 * picker yet (see product/[id].tsx), so a variant product only navigates
 * to its detail page, same restriction as there.
 */
export function ProductCard({
  product,
  tenant,
  onPress,
}: {
  product: Product
  tenant: PublicTenant | null | undefined
  onPress: () => void
}) {
  const theme = useTheme()
  const addItem = useCartStore((s) => s.addItem)
  const [justAdded, setJustAdded] = useState(false)
  const scale = useRef(new Animated.Value(1)).current

  const cover = product.images.find((i) => i.isCover) ?? product.images[0]
  const stock = tenant?.tracksInventory ? product.quantity : undefined
  const soldOut = stock !== undefined && stock <= 0
  const isNew = Date.now() - new Date(product.createdAt).getTime() < NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000
  const canQuickAdd = !product.hasVariants && !soldOut

  function onAdd() {
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: Number.parseFloat(product.price),
      quantity: 1,
      imageUrl: cover?.url,
      maxQuantity: stock,
    })
    setJustAdded(true)
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start()
    setTimeout(() => setJustAdded(false), 1000)
  }

  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={product.name}
    >
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: 'hidden',
          ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
            android: { elevation: 2 },
            default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
          }),
        }}
      >
        <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#fff' }}>
          {cover ? (
            <Image
              source={{ uri: cover.url }}
              accessibilityLabel={product.name}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}

          {isNew ? (
            <View style={{ position: 'absolute', top: 6, left: 6 }}>
              <Badge label="Nuevo" tone="info" />
            </View>
          ) : null}

          {canQuickAdd ? (
            <Animated.View style={{ position: 'absolute', bottom: 6, right: 6, transform: [{ scale }] }}>
              <Pressable
                onPress={onAdd}
                accessibilityRole="button"
                accessibilityLabel={`Agregar ${product.name} al carrito`}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.brand600,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
                    android: { elevation: 3 },
                    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
                  }),
                }}
              >
                <Ionicons name={justAdded ? 'checkmark' : 'add'} size={18} color="#fff" />
              </Pressable>
            </Animated.View>
          ) : null}
        </View>

        <View style={{ padding: 8, gap: 2 }}>
          <Text variant="caption" weight="medium" numberOfLines={2} style={{ minHeight: 32 }}>
            {product.name}
          </Text>
          <Text weight="bold" style={{ color: theme.colors.brand600 }}>
            {formatMoney(product.price, tenant)}
          </Text>
          {soldOut ? (
            <Text variant="caption" color="muted">
              Agotado
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}
