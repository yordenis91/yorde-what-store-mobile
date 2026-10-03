import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { Badge, Card, Chip, EmptyState, Input, Screen, Text, useTheme } from '@yws/ui'
import { CUSTOMER_SEGMENT_LABEL, formatMoney, useStaffAuthStore, type CustomerSegment } from '@yws/shared'
import { useCustomers } from '../../../src/hooks/queries'
import { useRefreshByUser } from '../../../src/hooks/useRefreshByUser'

const SEGMENTS: CustomerSegment[] = ['new', 'recurring', 'vip']

export default function CustomersScreen() {
  const theme = useTheme()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<CustomerSegment | undefined>()
  const customers = useCustomers({ search: search.trim() || undefined, segment })
  const { refreshing, onRefresh } = useRefreshByUser(customers.refetch)
  const items = customers.data?.pages.flatMap((p) => p.items) ?? []

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <Text variant="title">Clientes</Text>
      <Input placeholder="Buscar clientes" value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="Todos" selected={!segment} onPress={() => setSegment(undefined)} />
        {SEGMENTS.map((s) => (
          <Chip
            key={s}
            label={CUSTOMER_SEGMENT_LABEL[s]}
            selected={segment === s}
            onPress={() => setSegment(s)}
          />
        ))}
      </ScrollView>
    </View>
  )

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ gap: 10, padding: theme.spacing.lg }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={() => {
          if (customers.hasNextPage && !customers.isFetchingNextPage) void customers.fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          customers.isLoading ? (
            <ActivityIndicator style={{ marginVertical: 32 }} color={theme.colors.brand600} />
          ) : (
            <EmptyState
              title={search || segment ? 'No hay clientes con esos filtros' : 'Todavía no hay clientes'}
            />
          )
        }
        ListFooterComponent={
          customers.isFetchingNextPage ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={theme.colors.brand600} />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(tabs)/customers/${item.id}`)}>
            <Card
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
            >
              <View style={{ gap: 2, flex: 1 }}>
                <Text weight="semibold" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text color="muted" variant="caption" numberOfLines={1}>
                  {item.email ?? item.phone ?? '—'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text weight="semibold">
                  {item.totalOrders} {item.totalOrders === 1 ? 'pedido' : 'pedidos'} ·{' '}
                  {formatMoney(item.totalSpent, tenant)}
                </Text>
                <Badge
                  label={CUSTOMER_SEGMENT_LABEL[item.segment]}
                  tone={item.segment === 'vip' ? 'success' : 'neutral'}
                />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  )
}
