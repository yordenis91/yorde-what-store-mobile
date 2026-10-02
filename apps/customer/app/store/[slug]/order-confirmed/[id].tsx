import React from 'react'
import { Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Screen, Text } from '@yws/ui'
import { useCustomerAuthStore } from '@yws/shared'

export default function OrderConfirmedScreen() {
  const { slug, id, orderNumber, whatsappUrl } = useLocalSearchParams<{
    slug: string
    id: string
    orderNumber?: string
    whatsappUrl?: string
  }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const label = orderNumber ?? id.slice(0, 8)

  return (
    <Screen>
      <Card style={{ gap: 12, marginTop: 40 }}>
        <Text variant="title">Order placed!</Text>
        {whatsappUrl ? (
          <>
            {/* The store only hears about a WhatsApp order once the customer sends the
                pre-filled message — checkout opens it, but that can fail or be dismissed. */}
            <Text color="muted">
              Order #{label} is saved. Send the message in WhatsApp to confirm it with the store.
            </Text>
            <Button title="Open WhatsApp" onPress={() => Linking.openURL(whatsappUrl).catch(() => undefined)} />
          </>
        ) : (
          <Text color="muted">Order #{label} was sent to the store. They'll confirm it with you shortly.</Text>
        )}
        <Button
          title="Continue shopping"
          variant={whatsappUrl ? 'secondary' : 'primary'}
          onPress={() => router.replace(`/store/${slug}`)}
        />
        {/* Order history needs an account — a guest checkout would just bounce to login. */}
        {customer ? (
          <Button title="View my orders" variant="secondary" onPress={() => router.replace(`/store/${slug}/orders`)} />
        ) : null}
      </Card>
    </Screen>
  )
}
