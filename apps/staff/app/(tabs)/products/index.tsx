import React, { useState } from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { router } from 'expo-router'
import { Badge, Card, EmptyState, Input, Screen, Spinner, Text } from '@yws/ui'
import { formatMoney, useStaffAuthStore } from '@yws/shared'
import { useProducts } from '../../../src/hooks/queries'

export default function ProductsScreen() {
  const [search, setSearch] = useState('')
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const { data, isLoading } = useProducts(search || undefined)

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        Products
      </Text>
      <Input placeholder="Search products" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />
      {isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ gap: 10 }}
          ListEmptyComponent={<EmptyState title="No products" description="Products you add on the web dashboard will show up here." />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/(tabs)/products/${item.id}`)}>
              <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text weight="semibold">{item.name}</Text>
                  <Text color="muted" variant="caption">
                    {item.sku ?? 'No SKU'} · qty {item.quantity}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text weight="semibold">{tenant ? formatMoney(item.price, tenant) : item.price}</Text>
                  <Badge label={item.isPublished ? 'Published' : 'Draft'} tone={item.isPublished ? 'success' : 'neutral'} />
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}
