import React from 'react'
import { RefreshControl, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Badge, Card, EmptyState, Screen, Spinner, Text, useTheme } from '@yws/ui'
import { formatDate, formatMoney, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'
import { useTenant } from '../../../../src/hooks/queries'
import { ZelleProofCard } from '../../../../src/components/ZelleProofCard'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const weight = strong ? 'semibold' : undefined
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text weight={weight} style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Text weight={weight}>{value}</Text>
    </View>
  )
}

/**
 * The order's invoice-style page, at the same path as the web's
 * (`/store/<slug>/order/<id>`), so the link works from both. Reads the public
 * endpoint: the order's random id is the credential, so guests can open it too.
 */
export default function OrderScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()
  const theme = useTheme()
  const { data: tenant } = useTenant(slug)
  const order = useQuery({
    queryKey: ['public-order', slug, id],
    queryFn: () => customerApi.orders.public(id),
    enabled: !!id,
  })

  if (order.isLoading) return <Spinner fullScreen />
  if (!order.data) {
    return (
      <Screen>
        <EmptyState
          title="Pedido no encontrado"
          description="Verificá que el enlace esté completo o contactá a la tienda."
        />
      </Screen>
    )
  }

  const o = order.data
  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => order.refetch()} />}
    >
      <Text variant="title">Pedido #{o.orderNumber}</Text>
      <Text color="muted" style={{ marginBottom: 8 }}>
        {formatDate(o.createdAt)}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Badge label={ORDER_STATUS_LABEL[o.status]} tone="info" />
        <Badge
          label={`Pago: ${PAYMENT_STATUS_LABEL[o.paymentStatus]}`}
          tone={o.paymentStatus === 'PAID' ? 'success' : 'neutral'}
        />
      </View>

      <Card style={{ gap: 8, marginBottom: 12 }}>
        <Text weight="semibold">Artículos del pedido</Text>
        {o.items.map((item) => (
          <Row
            key={item.id}
            label={`${item.quantity}× ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`}
            value={formatMoney(item.lineTotal, tenant)}
          />
        ))}
        <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />
        <Row label="Subtotal" value={formatMoney(o.subtotal, tenant)} />
        {Number(o.taxTotal) > 0 ? <Row label="Impuestos" value={formatMoney(o.taxTotal, tenant)} /> : null}
        {Number(o.discountTotal) > 0 ? (
          <Row label="Descuento" value={`−${formatMoney(o.discountTotal, tenant)}`} />
        ) : null}
        <Row
          label={o.shipping ? `Envío (${o.shipping.name})` : 'Retiro en la tienda'}
          value={Number(o.shippingTotal) > 0 ? formatMoney(o.shippingTotal, tenant) : 'Gratis'}
        />
        <Row label="Total" value={formatMoney(o.grandTotal, tenant)} strong />
      </Card>

      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">Datos del cliente</Text>
        <Text>{o.customerName}</Text>
        {o.customerPhone ? <Text color="muted">{o.customerPhone}</Text> : null}
        {o.customerEmail ? <Text color="muted">{o.customerEmail}</Text> : null}
      </Card>

      {o.fulfillmentMethod === 'ZELLE' ? <ZelleProofCard slug={slug} orderId={o.id} /> : null}
    </Screen>
  )
}
