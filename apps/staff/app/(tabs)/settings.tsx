import React, { useState } from 'react'
import { router } from 'expo-router'
import { Button, Card, Text, Screen } from '@yws/ui'
import { getExpoPushTokenIfGranted, useStaffAuthStore } from '@yws/shared'
import { staffApi } from '../../src/lib/api'

export default function SettingsScreen() {
  const user = useStaffAuthStore((s) => s.user)
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const tenants = useStaffAuthStore((s) => s.tenants)
  const clear = useStaffAuthStore((s) => s.clear)
  const [loggingOut, setLoggingOut] = useState(false)

  async function onLogout() {
    setLoggingOut(true)
    try {
      // Best-effort — if permission was never granted there's no token to
      // unregister, and either way a failure here shouldn't block sign-out.
      const token = await getExpoPushTokenIfGranted()
      if (token) await staffApi.devices.unregister(token)
    } catch {
      // ignore
    }
    try {
      await staffApi.auth.logout()
    } catch {
      // Best-effort: proceed with a local sign-out even if the network call failed.
    } finally {
      clear()
      setLoggingOut(false)
      router.replace('/(auth)/login')
    }
  }

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Ajustes
      </Text>
      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">{user?.name}</Text>
        <Text color="muted">{user?.email}</Text>
      </Card>
      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">Tienda</Text>
        <Text color="muted">{tenant?.name}</Text>
      </Card>
      {tenants.length > 1 ? (
        <Button title="Cambiar de tienda" variant="secondary" onPress={() => router.push('/select-tenant')} style={{ marginBottom: 12 }} />
      ) : null}
      <Button title="Cerrar sesión" variant="danger" onPress={onLogout} loading={loggingOut} />
    </Screen>
  )
}
