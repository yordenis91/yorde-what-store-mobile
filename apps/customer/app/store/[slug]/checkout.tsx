import React, { useState } from 'react'
import { Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, EmptyState, Input, Screen, Text } from '@yws/ui'
import { extractErrorMessage, useCartStore, type CreateOrderResult, type FulfillmentMethod } from '@yws/shared'
import { customerApi } from '../../../src/lib/api'
import { useTenant } from '../../../src/hooks/queries'

export default function CheckoutScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: tenant } = useTenant(slug)
  const items = useCartStore((s) => s.items)
  const couponCode = useCartStore((s) => s.couponCode)
  const clearCart = useCartStore((s) => s.clear)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <Screen>
        <EmptyState title="Your cart is empty" />
      </Screen>
    )
  }

  // Payment fulfillment (Stripe/MercadoPago checkout sessions) isn't wired up
  // yet — WhatsApp is the tenant's default channel and the one every tenant
  // has available, so it's the only path implemented for v1.
  const fulfillmentMethod: FulfillmentMethod = 'WHATSAPP'

  async function onPlaceOrder() {
    if (!name.trim()) {
      setError('Enter your name')
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
      setError(extractErrorMessage(err, 'Could not place your order. Please try again.'))
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
        Checkout
      </Text>
      <Card style={{ gap: 12 }}>
        <Input label="Full name" value={name} onChangeText={setName} />
        <Input label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Email (optional)" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {tenant?.whatsappEnabled ? (
          <Text color="muted" variant="caption">
            You'll be taken to WhatsApp to confirm your order with {tenant.name}.
          </Text>
        ) : null}
        {error ? <Text color="danger">{error}</Text> : null}
        <Button title="Place order" onPress={onPlaceOrder} loading={loading} />
      </Card>
    </Screen>
  )
}
