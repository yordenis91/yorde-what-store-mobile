import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@yws/ui'
import { useCartStore } from '@yws/shared'

type IconName = React.ComponentProps<typeof Ionicons>['name']

function tabIcon(focused: IconName, unfocused: IconName) {
  function TabIcon({ color, size, focused: isFocused }: { color: string; size: number; focused: boolean }) {
    return <Ionicons name={isFocused ? focused : unfocused} size={size} color={color} />
  }
  return TabIcon
}

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
      <Tabs.Screen name="index" options={{ title: 'Tienda', tabBarIcon: tabIcon('storefront', 'storefront-outline') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Carrito',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarIcon: tabIcon('cart', 'cart-outline'),
        }}
      />
      <Tabs.Screen name="orders/index" options={{ title: 'Pedidos', tabBarIcon: tabIcon('receipt', 'receipt-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Cuenta', tabBarIcon: tabIcon('person', 'person-outline') }} />
    </Tabs>
  )
}
