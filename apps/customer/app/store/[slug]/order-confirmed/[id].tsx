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
        <Text variant="title">¡Pedido realizado!</Text>
        {whatsappUrl ? (
          <>
            {/* The store only hears about a WhatsApp order once the customer sends the
                pre-filled message — checkout opens it, but that can fail or be dismissed. */}
            <Text color="muted">
              Guardamos tu pedido #{label}. Enviá el mensaje de WhatsApp para confirmarlo con la tienda.
            </Text>
            <Button title="Abrir WhatsApp" onPress={() => Linking.openURL(whatsappUrl).catch(() => undefined)} />
          </>
        ) : (
          <Text color="muted">Tu pedido #{label} fue enviado a la tienda. Te lo van a confirmar en breve.</Text>
        )}
        <Button
          title="Seguir comprando"
          variant={whatsappUrl ? 'secondary' : 'primary'}
          onPress={() => router.replace(`/store/${slug}`)}
        />
        {/* Order history needs an account — a guest checkout would just bounce to login. */}
        {customer ? (
          <Button title="Ver mis pedidos" variant="secondary" onPress={() => router.replace(`/store/${slug}/orders`)} />
        ) : null}
      </Card>
    </Screen>
  )
}
