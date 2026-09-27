import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Screen, Text } from '@yws/ui'

export default function OrderConfirmedScreen() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()

  return (
    <Screen>
      <Card style={{ gap: 12, marginTop: 40 }}>
        <Text variant="title">Order placed!</Text>
        <Text color="muted">Order #{id.slice(0, 8)} was sent to the store. They'll confirm it with you shortly.</Text>
        <Button title="Continue shopping" onPress={() => router.replace(`/store/${slug}`)} />
        <Button
          title="View my orders"
          variant="secondary"
          onPress={() => router.replace(`/store/${slug}/orders`)}
        />
      </Card>
    </Screen>
  )
}
