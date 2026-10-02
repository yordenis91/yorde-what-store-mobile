import React, { useEffect, useState } from 'react'
import { Linking, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, EmptyState, Input, Screen, Text } from '@yws/ui'
import {
  extractErrorMessage,
  formatMoney,
  useCartStore,
  type CreateOrderResult,
  type FulfillmentMethod,
} from '@yws/shared'
import { customerApi } from '../../../src/lib/api'
import { useCheckoutQuote, useTenant } from '../../../src/hooks/queries'

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const weight = strong ? 'semibold' : undefined
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text weight={weight}>{label}</Text>
      <Text weight={weight}>{value}</Text>
    </View>
  )
}

export default function CheckoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: tenant } = useTenant(slug)
  const items = useCartStore((s) => s.items)
  const couponCode = useCartStore((s) => s.couponCode)
  const setCoupon = useCartStore((s) => s.setCoupon)
  const clearCart = useCartStore((s) => s.clear)
  const quote = useCheckoutQuote(slug, items, couponCode)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The server is the authority on whether a code applies, so a rejected one
  // is dropped rather than left looking active (same as the web checkout).
  const rejectedCoupon = quote.data?.couponError ?? null
  useEffect(() => {
    if (rejectedCoupon) {
      setCouponError(rejectedCoupon)
      setCoupon(null)
    }
  }, [rejectedCoupon, setCoupon])

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState title="Tu carrito está vacío" />
      </Screen>
    )
  }

  // Payment fulfillment (Stripe/MercadoPago checkout sessions) isn't wired up
  // yet — WhatsApp is the tenant's default channel and the one every tenant
  // has available, so it's the only path implemented for v1.
  const fulfillmentMethod: FulfillmentMethod = 'WHATSAPP'

  // Reported by the quote so the customer finds out before submitting; order
  // creation is what actually enforces it.
  const stockIssues = quote.data?.stockIssues ?? []
  const canPlaceOrder = !!quote.data && !quote.isFetching && stockIssues.length === 0

  function onApplyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setCouponError(null)
    setCoupon(code)
  }

  async function onPlaceOrder() {
    if (!name.trim()) {
      setError('Ingresá tu nombre')
      return
    }
    setLoading(true)
    setError(null)
    let result: CreateOrderResult
    try {
      result = await customerApi.orders.create({
        customerName: name,
        customerPhone: phone || undefined,
        customerEmail: email || undefined,
        couponCode: couponCode ?? undefined,
        fulfillmentMethod,
        items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      })
    } catch (err) {
      setError(extractErrorMessage(err, 'No pudimos registrar tu pedido. Intentá de nuevo.'))
      setLoading(false)
      return
    }

    // The order exists from here on — nothing below may report it as failed,
    // or the customer would retry and place it twice. Opening WhatsApp is
    // best-effort; the confirmation screen offers it again if it didn't open.
    clearCart()
    const whatsappUrl = result.fulfillment.type === 'WHATSAPP' ? result.fulfillment.redirectUrl : undefined
    router.replace({
      pathname: '/store/[slug]/order-confirmed/[id]',
      params: { slug, id: result.order.id, orderNumber: result.order.orderNumber, whatsappUrl },
    })
    if (whatsappUrl) Linking.openURL(whatsappUrl).catch(() => undefined)
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Finalizar compra
      </Text>

      {stockIssues.length > 0 ? (
        <Card style={{ gap: 6, marginBottom: 12 }}>
          <Text weight="semibold" color="danger">
            El stock cambió mientras comprabas
          </Text>
          {stockIssues.map((issue) => (
            <Text key={`${issue.productId}-${issue.variantId ?? ''}`} variant="caption">
              {issue.available > 0
                ? `${issue.name}: quedan solo ${issue.available}`
                : `${issue.name}: sin stock`}
            </Text>
          ))}
          <Button
            title="Ajustar en el carrito"
            variant="secondary"
            onPress={() => router.push(`/store/${slug}/cart`)}
          />
        </Card>
      ) : null}

      <Card style={{ gap: 12, marginBottom: 12 }}>
        <Text weight="semibold">Cupón</Text>
        {couponCode ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>
              {quote.data?.coupon ? `Cupón ${quote.data.coupon.code} aplicado` : `Verificando ${couponCode}…`}
            </Text>
            <Button title="Quitar" variant="ghost" fullWidth={false} onPress={() => setCoupon(null)} />
          </View>
        ) : (
          <>
            <Input
              placeholder="Código de cupón"
              autoCapitalize="characters"
              value={couponInput}
              onChangeText={setCouponInput}
            />
            {couponError ? <Text color="danger">{couponError}</Text> : null}
            <Button
              title="Aplicar"
              variant="secondary"
              disabled={!couponInput.trim()}
              onPress={onApplyCoupon}
            />
          </>
        )}
      </Card>

      <Card style={{ gap: 8, marginBottom: 12 }}>
        {quote.data ? (
          <>
            <SummaryRow label="Subtotal" value={formatMoney(quote.data.subtotal, tenant)} />
            {quote.data.taxTotal > 0 ? (
              <SummaryRow label="Impuestos" value={formatMoney(quote.data.taxTotal, tenant)} />
            ) : null}
            {quote.data.discountTotal > 0 ? (
              <SummaryRow label="Descuento" value={`−${formatMoney(quote.data.discountTotal, tenant)}`} />
            ) : null}
            {quote.data.shippingTotal > 0 ? (
              <SummaryRow label="Envío" value={formatMoney(quote.data.shippingTotal, tenant)} />
            ) : null}
            <SummaryRow label="Total" value={formatMoney(quote.data.grandTotal, tenant)} strong />
          </>
        ) : quote.isError ? (
          <>
            <Text color="danger">No pudimos calcular el total.</Text>
            <Button title="Intentar de nuevo" variant="secondary" onPress={() => quote.refetch()} />
          </>
        ) : (
          <Text color="muted">Calculando el total…</Text>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <Input label="Nombre completo" value={name} onChangeText={setName} />
        <Input label="Teléfono" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input
          label="Email (opcional)"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {tenant?.whatsappEnabled ? (
          <Text color="muted" variant="caption">
            Te vamos a llevar a WhatsApp para confirmar tu pedido con {tenant.name}.
          </Text>
        ) : null}
        {error ? <Text color="danger">{error}</Text> : null}
        <Button title="Confirmar pedido" onPress={onPlaceOrder} loading={loading} disabled={!canPlaceOrder} />
      </Card>
    </Screen>
  )
}
