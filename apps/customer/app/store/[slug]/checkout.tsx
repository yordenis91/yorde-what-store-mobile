import React, { useEffect, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, EmptyState, Input, Screen, Text, useTheme } from '@yws/ui'
import {
  cleanShippingAddress,
  deliveryAddressError,
  extractErrorMessage,
  formatMoney,
  useCartStore,
  type CreateOrderResult,
  type FulfillmentMethod,
  type PublicTenant,
  type ShippingAddress,
} from '@yws/shared'
import { customerApi } from '../../../src/lib/api'
import { useCheckoutQuote, useStorefrontShippings, useTenant } from '../../../src/hooks/queries'

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const weight = strong ? 'semibold' : undefined
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text weight={weight}>{label}</Text>
      <Text weight={weight}>{value}</Text>
    </View>
  )
}

interface MethodOption {
  value: FulfillmentMethod
  label: string
  hint: string
}

/**
 * The payment methods this app can complete for this store. Gated the same
 * way as the web checkout: WhatsApp on `whatsappEnabled`, Zelle on the
 * presence of `zellePaymentInfo` (the api only sends it when Zelle is set up).
 * Telegram, Stripe and MercadoPago aren't implemented in the app yet.
 */
function availableMethods(tenant: PublicTenant | undefined): MethodOption[] {
  const methods: MethodOption[] = []
  if (tenant?.whatsappEnabled) {
    methods.push({
      value: 'WHATSAPP',
      label: 'Pedir por WhatsApp',
      hint: 'Tu pedido se abre como mensaje de WhatsApp a la tienda.',
    })
  }
  if (tenant?.zellePaymentInfo) {
    methods.push({
      value: 'ZELLE',
      label: 'Pagar con Zelle',
      hint: 'Enviá el pago por Zelle y luego subí una captura de la confirmación.',
    })
  }
  return methods
}

/** A tappable, radio-like option row — used for both delivery and payment choices. */
function ChoiceRow({
  title,
  hint,
  selected,
  onSelect,
}: {
  title: string
  hint: string
  selected: boolean
  onSelect: () => void
}) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={{
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.brand600 : theme.colors.border,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        gap: 2,
      }}
    >
      <Text weight="semibold">{title}</Text>
      <Text color="muted" variant="caption">
        {hint}
      </Text>
    </Pressable>
  )
}

function ZelleInstructions({ info }: { info: NonNullable<PublicTenant['zellePaymentInfo']> }) {
  const sendTo = [info.recipientEmail, info.recipientPhone].filter(Boolean).join(' · ')
  return (
    <View style={{ gap: 4 }}>
      <Text weight="semibold">Cómo pagar con Zelle</Text>
      {info.recipientName ? <Text>Nombre del destinatario: {info.recipientName}</Text> : null}
      {sendTo ? <Text>Enviar a: {sendTo}</Text> : null}
      {info.instructions ? <Text color="muted">{info.instructions}</Text> : null}
      <Text color="muted" variant="caption">
        Después de confirmar el pedido vas a poder subir la captura del pago.
      </Text>
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
  const shippings = useStorefrontShippings(slug)
  // null means pickup in store — the only option when the store has no shippings.
  const [shippingChoice, setShippingChoice] = useState<string | null>(null)
  const shippingId = shippings.data?.some((s) => s.id === shippingChoice) ? shippingChoice : null
  const [address, setAddress] = useState<ShippingAddress>({})
  const quote = useCheckoutQuote(slug, items, couponCode, shippingId)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const [chosenMethod, setChosenMethod] = useState<FulfillmentMethod | null>(null)
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

  const methods = availableMethods(tenant)
  // Falls back to the first available method until the customer picks one.
  const fulfillmentMethod = methods.find((m) => m.value === chosenMethod)?.value ?? methods[0]?.value ?? null

  // Reported by the quote so the customer finds out before submitting; order
  // creation is what actually enforces it.
  const stockIssues = quote.data?.stockIssues ?? []
  const canPlaceOrder =
    !!fulfillmentMethod &&
    !shippings.isLoading &&
    !!quote.data &&
    !quote.isFetching &&
    stockIssues.length === 0
  const hasShippings = (shippings.data?.length ?? 0) > 0

  function setAddressField(field: keyof ShippingAddress) {
    return (value: string) => setAddress((current) => ({ ...current, [field]: value }))
  }

  function onApplyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setCouponError(null)
    setCoupon(code)
  }

  async function onPlaceOrder() {
    if (!fulfillmentMethod) return
    if (!name.trim()) {
      setError('Ingresá tu nombre')
      return
    }
    // Only delivery needs an address; pickup orders carry none (same as the web).
    const addressError = shippingId ? deliveryAddressError(address) : null
    if (addressError) {
      setError(addressError)
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
        shippingId: shippingId ?? undefined,
        shippingAddress: shippingId ? cleanShippingAddress(address) : undefined,
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
      params: {
        slug,
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        method: fulfillmentMethod,
        whatsappUrl,
      },
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

      {hasShippings ? (
        <Card style={{ gap: 12, marginBottom: 12 }}>
          <Text weight="semibold">Entrega</Text>
          <ChoiceRow
            title="Retiro en la tienda"
            hint="Sin envío — retirás tu pedido en la tienda."
            selected={!shippingId}
            onSelect={() => setShippingChoice(null)}
          />
          {shippings.data?.map((s) => (
            <ChoiceRow
              key={s.id}
              title={s.name}
              hint={Number(s.cost) > 0 ? formatMoney(s.cost, tenant) : 'Gratis'}
              selected={shippingId === s.id}
              onSelect={() => setShippingChoice(s.id)}
            />
          ))}
          {shippingId ? (
            <View style={{ gap: 12 }}>
              <Text weight="semibold">Dirección de entrega</Text>
              <Input
                label="Calle y número"
                value={address.line1 ?? ''}
                onChangeText={setAddressField('line1')}
              />
              <Input
                label="Departamento, piso (opcional)"
                value={address.line2 ?? ''}
                onChangeText={setAddressField('line2')}
              />
              <Input label="Ciudad" value={address.city ?? ''} onChangeText={setAddressField('city')} />
              <Input
                label="Provincia / estado"
                value={address.state ?? ''}
                onChangeText={setAddressField('state')}
              />
              <Input
                label="Código postal"
                value={address.postalCode ?? ''}
                onChangeText={setAddressField('postalCode')}
              />
              <Input
                label="Indicaciones para la entrega (opcional)"
                multiline
                value={address.notes ?? ''}
                onChangeText={setAddressField('notes')}
              />
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card style={{ gap: 12, marginBottom: 12 }}>
        <Text weight="semibold">Método de pago</Text>
        {methods.length === 0 ? (
          <Text color="danger">Esta tienda todavía no acepta pedidos desde la app.</Text>
        ) : (
          methods.map((m) => (
            <ChoiceRow
              key={m.value}
              title={m.label}
              hint={m.hint}
              selected={fulfillmentMethod === m.value}
              onSelect={() => setChosenMethod(m.value)}
            />
          ))
        )}
        {fulfillmentMethod === 'ZELLE' && tenant?.zellePaymentInfo ? (
          <ZelleInstructions info={tenant.zellePaymentInfo} />
        ) : null}
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
        {fulfillmentMethod === 'WHATSAPP' && tenant ? (
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
