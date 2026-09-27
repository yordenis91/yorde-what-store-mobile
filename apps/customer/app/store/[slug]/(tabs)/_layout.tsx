import React from 'react'
import { Tabs } from 'expo-router'
import { useTheme } from '@yws/ui'
import { useCartStore } from '@yws/shared'

export default function StoreTabsLayout() {
  const theme = useTheme()
  const itemCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand600,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Shop' }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarBadge: itemCount > 0 ? itemCount : undefined }} />
      <Tabs.Screen name="orders/index" options={{ title: 'Orders' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  )
}
