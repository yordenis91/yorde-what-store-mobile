import React from 'react'
import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'

type IconName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(focused: IconName, unfocused: IconName) {
  function TabIcon({ color, size, focused: isFocused }: { color: string; size: number; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : unfocused} size={size} color={color} />
  }
  return TabIcon
}

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
      <Tabs.Screen name="dashboard" options={{ title: 'Panel', tabBarIcon: tabIcon('grid', 'grid-outline') }} />
      <Tabs.Screen name="products/index" options={{ title: 'Productos', tabBarIcon: tabIcon('cube', 'cube-outline') }} />
      <Tabs.Screen name="orders/index" options={{ title: 'Pedidos', tabBarIcon: tabIcon('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="customers" options={{ title: 'Clientes', tabBarIcon: tabIcon('people', 'people-outline') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: tabIcon('settings', 'settings-outline') }} />
      <Tabs.Screen name="products/[id]" options={{ href: null }} />
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
    </Tabs>
  )
}
