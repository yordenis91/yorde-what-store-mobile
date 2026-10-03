import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Card, EmptyState, Input, Screen, Spinner, Text, useTheme } from '@yws/ui'
import { formatMoney } from '@yws/shared'
import { useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'
import { mediaUrl } from '../../../../src/lib/api'

export default function CatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const { data: tenant } = useTenant(slug)
  const products = useStorefrontProducts(slug, search || undefined)
  const items = products.data?.pages.flatMap((page) => page.items) ?? []

  async function onRefresh() {
    setRefreshing(true)
    try {
      await products.refetch()
    } finally {
      setRefreshing(false)
    }
  }

  function onEndReached() {
    if (products.hasNextPage && !products.isFetchingNextPage) void products.fetchNextPage()
  }

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 4 }}>
        {tenant?.name}
      </Text>
      {tenant?.tagline ? (
        <Text color="muted" style={{ marginBottom: 12 }}>
          {tenant.tagline}
        </Text>
      ) : null}
      <Input placeholder="Buscar productos" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />
      {products.isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12 }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          ListEmptyComponent={<EmptyState title="Todavía no hay productos" />}
          ListFooterComponent={
            products.isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 16 }} color={theme.colors.brand600} /> : null
          }
          renderItem={({ item }) => {
            const cover = item.images.find((i) => i.isCover) ?? item.images[0]
            return (
              // maxWidth keeps a lone last item at half width instead of stretching across the row.
              <Pressable style={{ flex: 1, maxWidth: '50%' }} onPress={() => router.push(`/store/${slug}/product/${item.id}`)}>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {cover ? (
                    <Image source={{ uri: mediaUrl(cover.url) }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: '100%', height: 120, backgroundColor: theme.colors.border }} />
                  )}
                  <View style={{ padding: 8, gap: 2 }}>
                    <Text weight="semibold" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text color="muted">{formatMoney(item.price, tenant)}</Text>
                  </View>
                </Card>
              </Pressable>
            )
          }}
        />
      )}
    </Screen>
  )
}
