import React, { useRef, useState } from 'react'
import { ActivityIndicator, Animated, FlatList, RefreshControl, View, type NativeScrollEvent } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { EmptyState, Screen, Spinner, useTheme } from '@yws/ui'
import { useStorefrontCategories, useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'
import { ProductCard } from '../../../../src/components/ProductCard'
import { ProductGridSkeleton } from '../../../../src/components/ProductGridSkeleton'
import { StorefrontHeader } from '../../../../src/components/StorefrontHeader'
import { TrustStrip } from '../../../../src/components/TrustStrip'
import { StorefrontFilters, type SortOption } from '../../../../src/components/StorefrontFilters'

/** How close to the bottom (px) the next catalog page starts loading. */
const LOAD_MORE_THRESHOLD = 400

export default function CatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('newest')
  const [refreshing, setRefreshing] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current

  const { data: tenant, isError: tenantFailed, refetch: refetchTenant } = useTenant(slug)
  const { data: categories } = useStorefrontCategories(slug)
  const products = useStorefrontProducts(slug, { search: search || undefined, categoryId, sort })
  const items = products.data?.pages.flatMap((page) => page.items) ?? []

  const isFiltered = search.trim().length > 0 || categoryId !== undefined
  function clearFilters() {
    setSearch('')
    setCategoryId(undefined)
  }

  async function onRefresh() {
    setRefreshing(true)
    try {
      await products.refetch()
    } finally {
      setRefreshing(false)
    }
  }

  // The grid below renders inside one ScrollView (so the banner can collapse and
  // the filters stick), so there's no FlatList `onEndReached` — detect the end here.
  function onScrollNearEnd({ layoutMeasurement, contentOffset, contentSize }: NativeScrollEvent) {
    const distanceFromEnd = contentSize.height - (layoutMeasurement.height + contentOffset.y)
    if (distanceFromEnd < LOAD_MORE_THRESHOLD && products.hasNextPage && !products.isFetchingNextPage) {
      void products.fetchNextPage()
    }
  }

  if (!tenant) {
    if (tenantFailed) {
      return (
        <Screen>
          <EmptyState
            title="No pudimos cargar la tienda"
            description="Revisá tu conexión e intentá de nuevo."
            actionLabel="Reintentar"
            onAction={() => void refetchTenant()}
          />
        </Screen>
      )
    }
    return <Spinner fullScreen />
  }

  return (
    <Screen padded={false}>
      <Animated.ScrollView
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: (e: { nativeEvent: NativeScrollEvent }) => onScrollNearEnd(e.nativeEvent),
        })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View>
          <StorefrontHeader tenant={tenant} scrollY={scrollY} slug={slug} />
          <TrustStrip trustBadges={tenant.trustBadges} />
        </View>

        <StorefrontFilters
          search={search}
          onSearchChange={setSearch}
          categories={categories ?? []}
          categoryId={categoryId}
          onSelectCategory={setCategoryId}
          sort={sort}
          onSelectSort={setSort}
        />

        <View style={{ padding: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          {products.isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(p) => p.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: theme.spacing.md }}
              contentContainerStyle={{ gap: theme.spacing.md }}
              ListEmptyComponent={
                isFiltered ? (
                  <EmptyState
                    title="Sin resultados"
                    description="No encontramos productos con esos filtros."
                    actionLabel="Limpiar filtros"
                    onAction={clearFilters}
                  />
                ) : (
                  <EmptyState title="Todavía no hay productos" description="Esta tienda todavía no publicó productos." />
                )
              }
              ListFooterComponent={
                products.isFetchingNextPage ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} color={theme.colors.brand600} />
                ) : null
              }
              renderItem={({ item }) => (
                <ProductCard product={item} tenant={tenant} onPress={() => router.push(`/store/${slug}/product/${item.id}`)} />
              )}
            />
          )}
        </View>
      </Animated.ScrollView>
    </Screen>
  )
}
