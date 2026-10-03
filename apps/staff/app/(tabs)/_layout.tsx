import React, { useCallback, useState } from 'react'
import { View } from 'react-native'
import { Redirect, router, Tabs } from 'expo-router'
import { useTheme } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'
import { useOrderEvents, type OrderEventPayload } from '../../src/hooks/useOrderEvents'
import { NewOrderBanner } from '../../src/components/NewOrderBanner'

export default function TabsLayout() {
  const theme = useTheme()
  const [newOrder, setNewOrder] = useState<OrderEventPayload | null>(null)
  const dismiss = useCallback(() => setNewOrder(null), [])
  // Mounted once for every tab, like the web admin's AdminLayout does.
  useOrderEvents(setNewOrder)

  // Cleared by the api client when the session expires mid-use (refresh
  // rejected) — send the seller back through the entry route instead of
  // leaving every tab stuck on 401s.
  const accessToken = useStaffAuthStore((s) => s.accessToken)
  if (!accessToken) return <Redirect href="/" />

  return (
    <View style={{ flex: 1 }}>
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
        <Tabs.Screen name="customers/index" options={{ title: 'Clientes' }} />
        <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
        <Tabs.Screen name="products/[id]" options={{ href: null }} />
        <Tabs.Screen name="orders/[id]" options={{ href: null }} />
        <Tabs.Screen name="customers/[id]" options={{ href: null }} />
      </Tabs>
      {newOrder ? (
        <NewOrderBanner
          order={newOrder}
          onDismiss={dismiss}
          onOpen={() => {
            setNewOrder(null)
            router.push(`/(tabs)/orders/${newOrder.id}`)
          }}
        />
      ) : null}
    </View>
  )
}
