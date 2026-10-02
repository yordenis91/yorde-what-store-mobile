import React from 'react'
import { Redirect, Tabs } from 'expo-router'
import { useTheme } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'

export default function TabsLayout() {
  const theme = useTheme()
  // Cleared by the api client when the session expires mid-use (refresh
  // rejected) — send the seller back through the entry route instead of
  // leaving every tab stuck on 401s.
  const accessToken = useStaffAuthStore((s) => s.accessToken)
  if (!accessToken) return <Redirect href="/" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand600,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Panel' }} />
      <Tabs.Screen name="products/index" options={{ title: 'Productos' }} />
      <Tabs.Screen name="orders/index" options={{ title: 'Pedidos' }} />
      <Tabs.Screen name="customers" options={{ title: 'Clientes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
      <Tabs.Screen name="products/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
    </Tabs>
  )
}
