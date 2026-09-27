import React from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { Redirect, router, useLocalSearchParams } from 'expo-router'
import { Badge, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { useCustomerAuthStore } from '@yws/shared'
import { useMyOrders } from '../../../../../src/hooks/queries'

export default function MyOrdersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const { data, isLoading } = useMyOrders(slug)

  if (!customer) return <Redirect href={`/store/${slug}/auth/login`} />
  if (isLoading) return <Spinner fullScreen />

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        My orders
      </Text>
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: 10 }}
        ListEmptyComponent={<EmptyState title="No orders yet" />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/store/${slug}/orders/${item.id}`)}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Text weight="semibold">#{item.orderNumber}</Text>
                <Text color="muted" variant="caption">
                  {item.currency} {item.grandTotal}
                </Text>
              </View>
              <Badge label={item.status} tone="info" />
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  )
}
