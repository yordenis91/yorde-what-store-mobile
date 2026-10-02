import React, { useState } from 'react'
import { FlatList, View } from 'react-native'
import { Badge, Card, EmptyState, Input, Screen, Spinner, Text } from '@yws/ui'
import { CUSTOMER_SEGMENT_LABEL } from '@yws/shared'
import { useCustomers } from '../../src/hooks/queries'
import { useRefreshByUser } from '../../src/hooks/useRefreshByUser'

export default function CustomersScreen() {
  const [search, setSearch] = useState('')
  const { data, isLoading, refetch } = useCustomers(search || undefined)
  const { refreshing, onRefresh } = useRefreshByUser(refetch)

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        Clientes
      </Text>
      <Input placeholder="Buscar clientes" value={search} onChangeText={setSearch} style={{ marginBottom: 12 }} />
      {isLoading ? (
        <Spinner fullScreen />
      ) : (
        <FlatList
          data={data?.items ?? []}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ gap: 10 }}
          ListEmptyComponent={<EmptyState title="Todavía no hay clientes" />}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2 }}>
                <Text weight="semibold">{item.name}</Text>
                <Text color="muted" variant="caption">
                  {item.email ?? item.phone ?? '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text weight="semibold">
                  {item.totalOrders} {item.totalOrders === 1 ? 'pedido' : 'pedidos'}
                </Text>
                <Badge label={CUSTOMER_SEGMENT_LABEL[item.segment]} tone={item.segment === 'vip' ? 'success' : 'neutral'} />
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  )
}
