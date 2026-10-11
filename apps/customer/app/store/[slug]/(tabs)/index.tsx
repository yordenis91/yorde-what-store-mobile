import React, { useRef, useState } from 'react'
import { Animated, FlatList, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { EmptyState, Screen, Spinner } from '@yws/ui'
import { useStorefrontCategories, useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'
import { ProductCard } from '../../../../src/components/ProductCard'
import { StorefrontHeader } from '../../../../src/components/StorefrontHeader'
import { TrustStrip } from '../../../../src/components/TrustStrip'
import { StorefrontFilters, type SortOption } from '../../../../src/components/StorefrontFilters'

export default function CatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<SortOption>('newest')
  const scrollY = useRef(new Animated.Value(0)).current

  const { data: tenant } = useTenant(slug)
  const { data: categories } = useStorefrontCategories(slug)
  const { data, isLoading } = useStorefrontProducts(slug, { search: search || undefined, categoryId, sort })

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

        <View style={{ padding: 16, paddingTop: 12 }}>
          {isLoading ? (
            <Spinner />
          ) : (
            <FlatList
              data={data?.items ?? []}
              keyExtractor={(p) => p.id}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ gap: 12 }}
              ListEmptyComponent={<EmptyState title="Todavía no hay productos" />}
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
