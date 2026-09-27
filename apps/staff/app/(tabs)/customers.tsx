import React, { useState } from 'react'
import { FlatList, View } from 'react-native'
import { Badge, Card, EmptyState, Input, Screen, Spinner, Text } from '@yws/ui'
import { useCustomers } from '../../src/hooks/queries'

export default function CustomersScreen() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useCustomers(search || undefined)

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        Customers
      </Text>
      <Input placeholder="Search customers" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />
      {isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 10 }}
          ListEmptyComponent={<EmptyState title="No customers yet" />}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Text weight="semibold">{item.name}</Text>
                <Text color="muted" variant="caption">
                  {item.email ?? item.phone ?? '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text weight="semibold">{item.totalOrders} orders</Text>
                <Badge label={item.segment} tone={item.segment === 'vip' ? 'success' : 'neutral'} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  )
}
