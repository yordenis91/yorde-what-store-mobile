import React from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Screen, Text } from '@yws/ui'
import { useCartStore, useCustomerAuthStore } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'
import { restoreCustomerSession } from '../../../../src/hooks/useBootstrapCustomerAuth'

export default function AccountScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const refreshToken = useCustomerAuthStore((s) => s.refreshToken)
  const isBootstrapping = useCustomerAuthStore((s) => s.isBootstrapping)
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
          Cuenta
        </Text>
        {/* A refresh token without a customer means restore couldn't reach the api — the session may still be fine. */}
        {refreshToken && !isBootstrapping ? (
          <Card style={{ gap: 12, marginBottom: 12 }}>
            <Text color="muted">No pudimos conectar con la tienda para recuperar tu sesión.</Text>
            <Button title="Intentar de nuevo" variant="secondary" onPress={() => restoreCustomerSession()} />
          </Card>
        ) : null}
        <Card style={{ gap: 12 }}>
          <Text color="muted">Iniciá sesión para ver tus pedidos y comprar más rápido.</Text>
          <Button title="Iniciar sesión" onPress={() => router.push(`/store/${slug}/auth/login`)} />
          <Button title="Crear cuenta" variant="secondary" onPress={() => router.push(`/store/${slug}/auth/register`)} />
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
        Cuenta
      </Text>
      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">{customer.name}</Text>
        <Text color="muted">{customer.email ?? customer.phone}</Text>
      </Card>
      <Button title="Cerrar sesión" variant="danger" onPress={onLogout} style={{ marginBottom: 12 }} />
      <Button title="Cambiar de tienda" variant="ghost" onPress={onSwitchStore} />
    </Screen>
  )
}
