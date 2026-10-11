import React, { useState } from 'react'
import { FlatList } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { EmptyState, Input, Screen, Spinner, Text } from '@yws/ui'
import { useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'
import { ProductCard } from '../../../../src/components/ProductCard'

export default function CatalogScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [search, setSearch] = useState('')
  const { data: tenant } = useTenant(slug)
  const { data, isLoading } = useStorefrontProducts(slug, search || undefined)

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
      {isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12 }}
          ListEmptyComponent={<EmptyState title="Todavía no hay productos" />}
          renderItem={({ item }) => (
            <ProductCard product={item} tenant={tenant} onPress={() => router.push(`/store/${slug}/product/${item.id}`)} />
          )}
        />
      )}
    </Screen>
  )
}
