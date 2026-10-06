import React from 'react'
import { Redirect, Stack } from 'expo-router'
import { useStaffAuthStore } from '@yws/shared'
import { useTheme } from '@yws/ui'

/**
 * The store-settings sections, pushed over the tab bar from the Ajustes tab.
 * A stack (not more tabs) because each one is a form you go into, save and
 * come back from — and it gives every section a native back button and title.
 */
export default function StoreSettingsLayout() {
  const theme = useTheme()
  // Same guard as the tabs layout: the api client clears the session when a
  // refresh is rejected mid-use, and no settings screen should sit there
  // retrying 401s.
  const accessToken = useStaffAuthStore((s) => s.accessToken)
  if (!accessToken) return <Redirect href="/" />

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.brand600,
        headerTitleStyle: { color: theme.colors.text },
        headerBackTitle: 'Ajustes',
      }}
    >
      <Stack.Screen name="general" options={{ title: 'General' }} />
      <Stack.Screen name="appearance" options={{ title: 'Apariencia' }} />
      <Stack.Screen name="social" options={{ title: 'Redes sociales' }} />
      <Stack.Screen name="channels" options={{ title: 'Canales de venta' }} />
      <Stack.Screen name="payments" options={{ title: 'Métodos de pago' }} />
      <Stack.Screen name="policies" options={{ title: 'Políticas' }} />
      <Stack.Screen name="email" options={{ title: 'Envío de emails' }} />
    </Stack>
  )
}
