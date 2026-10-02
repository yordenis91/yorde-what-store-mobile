import React, { useState } from 'react'
import { FlatList, Image, Pressable, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Card, EmptyState, Input, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney } from '@yws/shared'
import { useStorefrontProducts, useTenant } from '../../../../src/hooks/queries'

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
      <Input placeholder="Search products" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />
      {isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ gap: 12 }}
          ListEmptyComponent={<EmptyState title="No products yet" />}
          renderItem={({ item }) => {
            const cover = item.images.find((i) => i.isCover) ?? item.images[0]
            return (
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/store/${slug}/product/${item.id}`)}>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {cover ? (
                    <Image source={{ uri: cover.url }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: '100%', height: 120, backgroundColor: '#eee' }} />
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
