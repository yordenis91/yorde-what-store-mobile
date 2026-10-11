import React, { useRef, useState } from 'react'
import { Animated, FlatList, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { EmptyState, Screen, Spinner, useTheme } from '@yws/ui'
import { useStorefrontCategories, useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'
import { ProductCard } from '../../../../src/components/ProductCard'
import { ProductGridSkeleton } from '../../../../src/components/ProductGridSkeleton'
import { StorefrontHeader } from '../../../../src/components/StorefrontHeader'
import { TrustStrip } from '../../../../src/components/TrustStrip'
import { StorefrontFilters, type SortOption } from '../../../../src/components/StorefrontFilters'

export default function CatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('newest')
  const scrollY = useRef(new Animated.Value(0)).current

  const { data: tenant } = useTenant(slug)
  const { data: categories } = useStorefrontCategories(slug)
  const { data, isLoading } = useStorefrontProducts(slug, { search: search || undefined, categoryId, sort })

  const isFiltered = search.trim().length > 0 || categoryId !== undefined
  function clearFilters() {
    setSearch('')
    setCategoryId(undefined)
  }

  if (!tenant) return <Spinner fullScreen />

  return (
    <Screen padded={false}>
      <Animated.ScrollView
        stickyHeaderIndices={[1]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
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
          {isLoading ? (
            <ProductGridSkeleton />
          ) : (
            <FlatList
              data={data?.items ?? []}
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
