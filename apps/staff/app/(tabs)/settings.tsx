import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Badge, Button, Card, Screen, Text } from '@yws/ui'
import { getExpoPushTokenIfGranted, TENANT_ROLE_LABEL, useStaffAuthStore } from '@yws/shared'
import { ReadOnlyNotice, SettingsLink } from '../../src/components/settings'
import { useIsStoreOwner } from '../../src/hooks/queries'
import { staffApi } from '../../src/lib/api'

/** Each section of the store configuration, in the same order the web settings page lays them out. */
const SECTIONS = [
  { href: '/store-settings/general', title: 'General', hint: 'Nombre, lema, moneda e inventario' },
  { href: '/store-settings/appearance', title: 'Apariencia', hint: 'Logo, banner, color y logo de factura' },
  { href: '/store-settings/social', title: 'Redes sociales', hint: 'Los enlaces que ven tus clientes en la cabecera' },
  { href: '/store-settings/channels', title: 'Canales de venta', hint: 'WhatsApp, Telegram y el mensaje del pedido' },
  { href: '/store-settings/payments', title: 'Métodos de pago', hint: 'Zelle, Stripe y MercadoPago' },
  { href: '/store-settings/policies', title: 'Políticas de la tienda', hint: 'Venta, envío, devoluciones y privacidad' },
  { href: '/store-settings/email', title: 'Envío de emails', hint: 'Usar tu propio servidor SMTP' },
] as const

export default function SettingsScreen() {
  const user = useStaffAuthStore((s) => s.user)
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const tenants = useStaffAuthStore((s) => s.tenants)
  const clear = useStaffAuthStore((s) => s.clear)
  const isOwner = useIsStoreOwner()
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
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Ajustes
      </Text>
      <Card style={{ gap: 4, marginBottom: 12 }}>
        <Text weight="semibold">{user?.name}</Text>
        <Text color="muted">{user?.email}</Text>
      </Card>
      <Card style={{ gap: 8, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text weight="semibold">{tenant?.name ?? 'Sin tienda activa'}</Text>
            {tenant?.slug ? <Text color="muted" variant="caption">{tenant.slug}</Text> : null}
          </View>
          <Badge label={TENANT_ROLE_LABEL[tenant?.myRole ?? 'STAFF']} tone={isOwner ? 'info' : 'neutral'} />
        </View>
        {tenants.length > 1 ? (
          <Button title="Cambiar de tienda" variant="secondary" onPress={() => router.push('/select-tenant')} />
        ) : null}
      </Card>

      <Text variant="subtitle" style={{ marginBottom: 8 }}>
        Configuración de la tienda
      </Text>
      {isOwner ? null : <ReadOnlyNotice role={tenant?.myRole} />}
      <View style={{ gap: 8, marginBottom: 16 }}>
        {SECTIONS.map((section) => (
          <SettingsLink
            key={section.href}
            title={section.title}
            hint={section.hint}
            onPress={() => router.push(section.href)}
          />
        ))}
      </View>

      <Button title="Cerrar sesión" variant="danger" onPress={onLogout} loading={loggingOut} />
    </Screen>
  )
}
