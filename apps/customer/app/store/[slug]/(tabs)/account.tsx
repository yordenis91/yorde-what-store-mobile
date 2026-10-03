import React, { useState } from 'react'
import { Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Screen, Text } from '@yws/ui'
import { extractErrorMessage, useCartStore, useCustomerAuthStore } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'
import { restoreCustomerSession } from '../../../../src/hooks/useBootstrapCustomerAuth'
import { useTenant } from '../../../../src/hooks/queries'
import { publishedPolicies } from '../../../../src/lib/policies'

/** Links to the store's published policies — nothing at all when the store has written none. */
function StorePolicies({ slug, policies }: { slug: string; policies: ReturnType<typeof publishedPolicies> }) {
  if (policies.length === 0) return null
  return (
    <Card style={{ gap: 4, marginTop: 12 }}>
      <Text weight="semibold">Información de la tienda</Text>
      {policies.map((p) => (
        <Button
          key={p.path}
          title={p.title}
          variant="ghost"
          onPress={() => router.push(`/store/${slug}/${p.path}`)}
        />
      ))}
    </Card>
  )
}

export default function AccountScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const customer = useCustomerAuthStore((s) => s.customer)
  const refreshToken = useCustomerAuthStore((s) => s.refreshToken)
  const isBootstrapping = useCustomerAuthStore((s) => s.isBootstrapping)
  const clearSession = useCustomerAuthStore((s) => s.clear)
  const setStoreSlug = useCustomerAuthStore((s) => s.setTenantSlug)
  const setCartSlug = useCartStore((s) => s.setTenantSlug)
  const { data: tenant } = useTenant(slug)
  const policies = publishedPolicies(tenant)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function onSwitchStore() {
    setStoreSlug(null)
    setCartSlug(null)
    router.replace('/')
  }

  if (!customer) {
    return (
      <Screen scroll>
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
        <StorePolicies slug={slug} policies={policies} />
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

  async function deleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      // Clears the session on success; the screen then shows the signed-out state.
      await customerApi.me.delete()
    } catch (err) {
      setDeleteError(extractErrorMessage(err, 'No pudimos eliminar tu cuenta. Intentá de nuevo.'))
    } finally {
      setDeleting(false)
    }
  }

  function onDeleteAccount() {
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Vamos a borrar tu nombre, email, teléfono y direcciones, también de tus pedidos anteriores. ' +
        'Los pedidos se conservan sin tus datos, porque son registros de la tienda. Esto no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar cuenta', style: 'destructive', onPress: () => void deleteAccount() },
      ],
    )
  }

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Cuenta
      </Text>
      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">{customer.name}</Text>
        <Text color="muted">{customer.email ?? customer.phone}</Text>
      </Card>
      <Button title="Cerrar sesión" variant="danger" onPress={onLogout} style={{ marginBottom: 12 }} />
      <Button title="Cambiar de tienda" variant="ghost" onPress={onSwitchStore} style={{ marginBottom: 32 }} />
      {deleteError ? (
        <Text color="danger" style={{ marginBottom: 8 }}>
          {deleteError}
        </Text>
      ) : null}
      <Button title="Eliminar mi cuenta" variant="ghost" loading={deleting} onPress={onDeleteAccount} />
      <StorePolicies slug={slug} policies={policies} />
    </Screen>
  )
}
