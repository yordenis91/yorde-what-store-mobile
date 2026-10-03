import React from 'react'
import { Alert, Image, Linking, Pressable, RefreshControl, Share, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Badge, Button, Card, Chip, EmptyState, Screen, Spinner, Text, useTheme } from '@yws/ui'
import {
  buildWhatsAppUrl,
  extractErrorMessage,
  formatDate,
  formatMoney,
  FULFILLMENT_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  publicOrderLink,
  useStaffAuthStore,
  type Order,
  type OrderStatus,
} from '@yws/shared'
import {
  useConfirmZellePayment,
  useOrder,
  useRejectZellePayment,
  useUpdateOrderStatus,
} from '../../../src/hooks/queries'
import { mediaUrl, STOREFRONT_URL } from '../../../src/lib/api'

const STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED']
/** No way back from these on the api (stock released / money returned) — see its TERMINAL_ORDER_STATUSES. */
const TERMINAL: OrderStatus[] = ['CANCELLED', 'REFUNDED']

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

/** Same wording as the web admin's confirmations (orders.cancelConfirm / refundConfirm / changeStatusTitle). */
function confirmStatusChange(status: OrderStatus, onConfirm: () => void) {
  const message =
    status === 'CANCELLED'
      ? 'El pedido se cancelará y se liberará su stock. No se puede deshacer.'
      : status === 'REFUNDED'
        ? 'El pedido se marcará como reembolsado. Si se pagó con tarjeta, el pago se reembolsa a través de la pasarela. No se puede deshacer.'
        : undefined
  Alert.alert(`¿Cambiar el estado a ${ORDER_STATUS_LABEL[status]}?`, message, [
    { text: 'Volver', style: 'cancel' },
    { text: 'Cambiar', style: TERMINAL.includes(status) ? 'destructive' : 'default', onPress: onConfirm },
  ])
}

/**
 * Zelle has no gateway to confirm the payment, so a person checks the
 * customer's screenshot here and confirms it (paid + confirmed) or rejects it
 * (the proof is cleared and the customer can send another).
 */
function ZelleReview({ order }: { order: Order }) {
  const theme = useTheme()
  const confirm = useConfirmZellePayment()
  const reject = useRejectZellePayment()
  const error = confirm.error ?? reject.error

  if (order.paymentStatus === 'PAID') {
    return (
      <Card style={{ marginBottom: 12 }}>
        <Text weight="semibold">Pago por Zelle</Text>
        <Text color="success">Pago confirmado</Text>
      </Card>
    )
  }

  const proofUrl = order.paymentProofUrl ? mediaUrl(order.paymentProofUrl) : null
  return (
    <Card style={{ gap: 10, marginBottom: 12 }}>
      <Text weight="semibold">Pago por Zelle</Text>
      {proofUrl ? (
        <>
          {/* Tap to open the full-size screenshot. */}
          <Pressable
            onPress={() => Linking.openURL(proofUrl).catch(() => undefined)}
            accessibilityRole="imagebutton"
          >
            <Image
              source={{ uri: proofUrl }}
              style={{
                width: '100%',
                height: 280,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.border,
              }}
              resizeMode="contain"
            />
          </Pressable>
          {order.paymentReference ? <Text>Número de confirmación: {order.paymentReference}</Text> : null}
          {error ? (
            <Text color="danger">{extractErrorMessage(error, 'No pudimos actualizar el pago.')}</Text>
          ) : null}
          <Button
            title="Confirmar pago"
            loading={confirm.isPending}
            disabled={reject.isPending}
            onPress={() =>
              Alert.alert('¿Confirmar el pago?', 'El pedido quedará pagado y confirmado.', [
                { text: 'Volver', style: 'cancel' },
                { text: 'Confirmar', onPress: () => confirm.mutate(order.id) },
              ])
            }
          />
          <Button
            title="Rechazar comprobante"
            variant="ghost"
            loading={reject.isPending}
            disabled={confirm.isPending}
            onPress={() =>
              Alert.alert(
                '¿Rechazar el comprobante?',
                'Se descarta la captura y el cliente puede volver a enviarla.',
                [
                  { text: 'Volver', style: 'cancel' },
                  { text: 'Rechazar', style: 'destructive', onPress: () => reject.mutate(order.id) },
                ],
              )
            }
          />
        </>
      ) : (
        <Text color="muted">El cliente aún no ha enviado un comprobante de pago.</Text>
      )}
    </Card>
  )
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const order = useOrder(id)
  const updateStatus = useUpdateOrderStatus()

  if (order.isLoading) return <Spinner fullScreen />
  if (!order.data) {
    return (
      <Screen>
        <EmptyState title="Pedido no encontrado" />
      </Screen>
    )
  }

  const o = order.data
  const locked = TERMINAL.includes(o.status)
  const address = o.shippingAddress
  const addressLines = address
    ? [
        address.line1,
        address.line2,
        [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
        address.notes,
      ]
        .map((l) => l?.trim())
        .filter(Boolean)
    : []
  const link = tenant ? publicOrderLink(STOREFRONT_URL, tenant.slug, o.id) : null

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => order.refetch()} />}
    >
      <Text variant="title">#{o.orderNumber}</Text>
      <Text color="muted" style={{ marginBottom: 8 }}>
        {formatDate(o.createdAt)} · {FULFILLMENT_METHOD_LABEL[o.fulfillmentMethod]}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <Badge label={ORDER_STATUS_LABEL[o.status]} tone={locked ? 'danger' : 'info'} />
        <Badge
          label={`Pago: ${PAYMENT_STATUS_LABEL[o.paymentStatus]}`}
          tone={o.paymentStatus === 'PAID' ? 'success' : 'neutral'}
        />
      </View>

      {o.fulfillmentMethod === 'ZELLE' ? <ZelleReview order={o} /> : null}

      <Card style={{ gap: 10, marginBottom: 12 }}>
        <Text weight="semibold">Estado</Text>
        {locked ? (
          <Text color="muted">
            Este pedido está {ORDER_STATUS_LABEL[o.status].toLowerCase()} y no puede pasar a otro estado.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STATUSES.map((s) => (
              <Chip
                key={s}
                label={ORDER_STATUS_LABEL[s]}
                selected={s === o.status}
                disabled={updateStatus.isPending}
                onPress={() => {
                  if (s !== o.status)
                    confirmStatusChange(s, () => updateStatus.mutate({ id: o.id, status: s }))
                }}
              />
            ))}
          </View>
        )}
        {updateStatus.error ? (
          <Text color="danger">
            {extractErrorMessage(updateStatus.error, 'No pudimos cambiar el estado.')}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: 6, marginBottom: 12 }}>
        <Text weight="semibold">Cliente</Text>
        <Text>{o.customerName}</Text>
        {o.customerEmail ? <Text color="muted">{o.customerEmail}</Text> : null}
        {o.customerPhone ? (
          <>
            <Text color="muted">{o.customerPhone}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                title="Llamar"
                variant="secondary"
                fullWidth={false}
                onPress={() => Linking.openURL(`tel:${o.customerPhone}`).catch(() => undefined)}
              />
              <Button
                title="WhatsApp"
                variant="secondary"
                fullWidth={false}
                onPress={() =>
                  Linking.openURL(
                    buildWhatsAppUrl(
                      o.customerPhone!,
                      `Hola ${o.customerName}, sobre tu pedido #${o.orderNumber}`,
                    ),
                  ).catch(() => undefined)
                }
              />
            </View>
          </>
        ) : null}
      </Card>

      <Card style={{ gap: 6, marginBottom: 12 }}>
        <Text weight="semibold">Entrega</Text>
        <Text>{o.shipping ? o.shipping.name : 'Retiro en la tienda'}</Text>
        {addressLines.map((line) => (
          <Text key={line} color="muted">
            {line}
          </Text>
        ))}
      </Card>

      <Card style={{ gap: 8, marginBottom: 12 }}>
        <Text weight="semibold">Productos</Text>
        {o.items.map((item) => (
          <Row
            key={item.id}
            label={`${item.quantity}× ${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`}
            value={formatMoney(item.lineTotal, tenant)}
          />
        ))}
        <Row label="Subtotal" value={formatMoney(o.subtotal, tenant)} />
        {Number(o.taxTotal) > 0 ? <Row label="Impuestos" value={formatMoney(o.taxTotal, tenant)} /> : null}
        {Number(o.discountTotal) > 0 ? (
          <Row label="Descuento" value={`−${formatMoney(o.discountTotal, tenant)}`} />
        ) : null}
        {Number(o.shippingTotal) > 0 ? (
          <Row label="Envío" value={formatMoney(o.shippingTotal, tenant)} />
        ) : null}
        <Row label="Total" value={formatMoney(o.grandTotal, tenant)} strong />
      </Card>

      {link ? (
        <Card style={{ gap: 8 }}>
          <Text weight="semibold">Enlace del pedido</Text>
          <Text color="muted" variant="caption">
            La página del pedido que ve el cliente. Compartila si la perdió, o para enviarle el detalle.
          </Text>
          <Text selectable>{link}</Text>
          <Button
            title="Compartir enlace"
            variant="secondary"
            onPress={() =>
              Share.share({ message: `Pedido #${o.orderNumber}: ${link}`, url: link }).catch(() => undefined)
            }
          />
        </Card>
      ) : null}
    </Screen>
  )
}
