import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Card, Chip, EmptyState, Input, Screen, Text, useTheme } from '@yws/ui'
import { formatMoney, type ProductSort } from '@yws/shared'
import { useStorefrontCategories, useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'
import { mediaUrl } from '../../../../src/lib/api'
import { StoreHeader } from '../../../../src/components/StoreHeader'

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: de menor a mayor' },
  { value: 'price_desc', label: 'Precio: de mayor a menor' },
]

export default function CatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>()
  const [sort, setSort] = useState<ProductSort>('newest')
  const [refreshing, setRefreshing] = useState(false)
  const { data: tenant } = useTenant(slug)
  const { data: categories } = useStorefrontCategories(slug)
  const products = useStorefrontProducts(slug, { search: search || undefined, categoryId, sort })
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

  // Scrolls with the products. Kept mounted across searches (the list never
  // swaps to a full-screen spinner) so the search box doesn't lose focus.
  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      {tenant ? <StoreHeader tenant={tenant} /> : null}
      <Input placeholder="Buscar productos" value={search} onChangeText={setSearch} />
      {categories && categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Todas" selected={!categoryId} onPress={() => setCategoryId(undefined)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {SORT_OPTIONS.map((o) => (
          <Chip key={o.value} label={o.label} selected={sort === o.value} onPress={() => setSort(o.value)} />
        ))}
      </ScrollView>
    </View>
  )

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12, padding: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          products.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} color={theme.colors.brand600} />
          ) : (
            <EmptyState title={search || categoryId ? 'No se encontraron productos' : 'Todavía no hay productos'} />
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
            // maxWidth keeps a lone last item at half width instead of stretching across the row.
            <Pressable
              style={{ flex: 1, maxWidth: '50%' }}
              onPress={() => router.push(`/store/${slug}/product/${item.id}`)}
            >
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {cover ? (
                  <Image
                    source={{ uri: mediaUrl(cover.url) }}
                    style={{ width: '100%', height: 120 }}
                    resizeMode="cover"
                  />
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
    </Screen>
  )
}
