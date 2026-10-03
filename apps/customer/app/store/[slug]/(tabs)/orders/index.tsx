import React from 'react'
import { FlatList, Pressable, RefreshControl, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Badge, Button, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { formatDate, formatMoney, ORDER_STATUS_LABEL, useCustomerAuthStore } from '@yws/shared'
import { useMyOrders, useTenant } from '../../../../../src/hooks/queries'

export default function MyOrdersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const isBootstrapping = useCustomerAuthStore((s) => s.isBootstrapping)
  const { data: tenant } = useTenant(slug)
  const orders = useMyOrders(slug, !!customer)

  // Don't ask to sign in while a stored session is still being restored.
  if (isBootstrapping) return <Spinner fullScreen />

  // Rendered in place rather than redirecting: a <Redirect> out of a tab
  // screen into the parent stack can leave the tab blank.
  if (!customer) {
    return (
      <Screen>
        <Text variant="title" style={{ marginBottom: 16 }}>
          Mis pedidos
        </Text>
        <Card style={{ gap: 12 }}>
          <Text color="muted">Iniciá sesión para ver tus pedidos.</Text>
          <Button title="Iniciar sesión" onPress={() => router.push(`/store/${slug}/auth/login`)} />
          <Button
            title="Crear cuenta"
            variant="secondary"
            onPress={() => router.push(`/store/${slug}/auth/register`)}
          />
        </Card>
      </Screen>
    )
  }

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 12 }}>
        Mis pedidos
      </Text>
      {orders.isLoading ? (
        <Spinner fullScreen />
      ) : orders.isError ? (
        <EmptyState
          title="No pudimos cargar tus pedidos"
          description="Revisá tu conexión e intentá de nuevo."
          actionLabel="Intentar de nuevo"
          onAction={() => orders.refetch()}
        />
      ) : (
        <FlatList
          data={orders.data ?? []}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={orders.isRefetching} onRefresh={() => orders.refetch()} />
          }
          ListEmptyComponent={<EmptyState title="Todavía no hay pedidos" />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/store/${slug}/order/${item.id}`)}>
              <Card
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View style={{ gap: 2, flex: 1 }}>
                  <Text weight="semibold">#{item.orderNumber}</Text>
                  <Text color="muted" variant="caption">
                    {formatDate(item.createdAt)} · {formatMoney(item.grandTotal, tenant)}
                  </Text>
                </View>
                <Badge label={ORDER_STATUS_LABEL[item.status]} tone="info" />
              </Card>
            </Pressable>
          )}
        />
      )}
    </Screen>
  )
}
