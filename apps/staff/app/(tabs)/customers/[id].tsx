import React from 'react'
import { Linking, Pressable, RefreshControl, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Badge, Button, Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import {
  buildWhatsAppUrl,
  CUSTOMER_SEGMENT_LABEL,
  formatDate,
  formatMoney,
  ORDER_STATUS_LABEL,
  useStaffAuthStore,
} from '@yws/shared'
import { useCustomer } from '../../../src/hooks/queries'

/** A customer's contact details, totals and order history (GET /customers/:id), like the web admin's detail page. */
export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const customer = useCustomer(id)

  if (customer.isLoading) return <Spinner fullScreen />
  if (!customer.data) {
    return (
      <Screen>
        <EmptyState title="Cliente no encontrado" />
      </Screen>
    )
  }

  const c = customer.data
  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={customer.isRefetching} onRefresh={() => customer.refetch()} />
      }
    >
      <Text variant="title">{c.name}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 16 }}>
        <Badge label={CUSTOMER_SEGMENT_LABEL[c.segment]} tone={c.segment === 'vip' ? 'success' : 'neutral'} />
      </View>

      <Card style={{ gap: 6, marginBottom: 12 }}>
        <Text weight="semibold">Contacto</Text>
        {c.email ? <Text>{c.email}</Text> : null}
        {c.phone ? (
          <>
            <Text>{c.phone}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title="Llamar"
                variant="secondary"
                fullWidth={false}
                onPress={() => Linking.openURL(`tel:${c.phone}`).catch(() => undefined)}
              />
              <Button
                title="WhatsApp"
                variant="secondary"
                fullWidth={false}
                onPress={() =>
                  Linking.openURL(buildWhatsAppUrl(c.phone!, `Hola ${c.name}`)).catch(() => undefined)
                }
              />
            </View>
          </>
        ) : null}
        {!c.email && !c.phone ? <Text color="muted">Sin datos de contacto.</Text> : null}
        <Text color="muted" variant="caption">
          Cliente desde {formatDate(c.createdAt)}
        </Text>
      </Card>

      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">Resumen</Text>
        <Text>
          {c.totalOrders} {c.totalOrders === 1 ? 'pedido' : 'pedidos'} · {formatMoney(c.totalSpent, tenant)}{' '}
          en total
        </Text>
        {c.lastOrderAt ? <Text color="muted">Último pedido: {formatDate(c.lastOrderAt)}</Text> : null}
      </Card>

      <Card style={{ gap: 8 }}>
        <Text weight="semibold">Pedidos</Text>
        {c.orders.length === 0 ? <Text color="muted">Todavía no hizo pedidos.</Text> : null}
        {c.orders.map((o) => (
          <Pressable key={o.id} onPress={() => router.push(`/(tabs)/orders/${o.id}`)}>
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}
            >
              <View style={{ flex: 1 }}>
                <Text weight="semibold">#{o.orderNumber}</Text>
                <Text color="muted" variant="caption">
                  {formatDate(o.createdAt)} · {ORDER_STATUS_LABEL[o.status]}
                </Text>
              </View>
              <Text>{formatMoney(o.grandTotal, tenant)}</Text>
            </View>
          </Pressable>
        ))}
      </Card>
    </Screen>
  )
}
