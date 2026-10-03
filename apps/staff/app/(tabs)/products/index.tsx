import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, View } from 'react-native'
import { router } from 'expo-router'
import { Badge, Card, EmptyState, Input, Screen, Text, useTheme } from '@yws/ui'
import { formatMoney, useStaffAuthStore } from '@yws/shared'
import { useProducts } from '../../../src/hooks/queries'
import { useRefreshByUser } from '../../../src/hooks/useRefreshByUser'
import { mediaUrl } from '../../../src/lib/api'

export default function ProductsScreen() {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const products = useProducts(search.trim() || undefined)
  const { refreshing, onRefresh } = useRefreshByUser(products.refetch)
  const items = products.data?.pages.flatMap((p) => p.items) ?? []

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <Text variant="title">Productos</Text>
      <Input placeholder="Buscar productos" value={search} onChangeText={setSearch} />
    </View>
  )

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 10, padding: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          products.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} color={theme.colors.brand600} />
          ) : (
            <EmptyState
              title={search ? 'No se encontraron productos' : 'No hay productos'}
              description={search ? undefined : 'Los productos que cargues desde el panel web van a aparecer acá.'}
            />
          )
        }
        ListFooterComponent={
          products.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={theme.colors.brand600} />
          ) : null
        }
        renderItem={({ item }) => {
          const cover = item.images.find((i) => i.isCover) ?? item.images[0]
          return (
            <Pressable onPress={() => router.push(`/(tabs)/products/${item.id}`)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {cover ? (
                  <Image
                    source={{ uri: mediaUrl(cover.url) }}
                    style={{ width: 52, height: 52, borderRadius: theme.radius.md, backgroundColor: theme.colors.border }}
                  />
                ) : (
                  <View style={{ width: 52, height: 52, borderRadius: theme.radius.md, backgroundColor: theme.colors.border }} />
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text color="muted" variant="caption">
                    {item.sku ?? 'Sin SKU'} · {item.hasVariants ? `${item.variants.length} variantes` : `stock ${item.quantity}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text weight="semibold">{formatMoney(item.price, tenant)}</Text>
                  <Badge label={item.isPublished ? 'Publicado' : 'Borrador'} tone={item.isPublished ? 'success' : 'neutral'} />
                </View>
              </Card>
            </Pressable>
          )
        }}
      />
    </Screen>
  )
}
