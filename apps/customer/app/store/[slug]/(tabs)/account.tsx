import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Screen, Text } from '@yws/ui'
import { useCartStore, useCustomerAuthStore } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'

export default function AccountScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const clearSession = useCustomerAuthStore((s) => s.clear)
  const setStoreSlug = useCustomerAuthStore((s) => s.setTenantSlug)
  const setCartSlug = useCartStore((s) => s.setTenantSlug)

  function onSwitchStore() {
    setStoreSlug(null)
    setCartSlug(null)
    router.replace('/')
  }

  if (!customer) {
    return (
      <Screen>
        <Text variant="title" style={{ marginBottom: 16 }}>
          Account
        </Text>
        <Card style={{ gap: 12 }}>
          <Text color="muted">Sign in to view your order history and check out faster.</Text>
          <Button title="Sign in" onPress={() => router.push(`/store/${slug}/auth/login`)} />
          <Button title="Create account" variant="secondary" onPress={() => router.push(`/store/${slug}/auth/register`)} />
        </Card>
      </Screen>
    )
  }

  async function onLogout() {
    try {
      await customerApi.auth.logout()
    } catch {
      // Best-effort: proceed with a local sign-out even if the network call failed.
    } finally {
      clearSession()
    }
  }

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Account
      </Text>
      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">{customer.name}</Text>
        <Text color="muted">{customer.email ?? customer.phone}</Text>
      </Card>
      <Button title="Log out" variant="danger" onPress={onLogout} style={{ marginBottom: 12 }} />
      <Button title="Switch store" variant="ghost" onPress={onSwitchStore} />
    </Screen>
  )
}
