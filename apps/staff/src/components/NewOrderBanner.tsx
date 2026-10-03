import React, { useEffect } from 'react'
import { Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text, useTheme } from '@yws/ui'
import type { OrderEventPayload } from '../hooks/useOrderEvents'

const VISIBLE_MS = 8000

/** The in-app "new order" nudge the live feed raises — tap to open it, or it hides after a few seconds. */
export function NewOrderBanner({
  order,
  onOpen,
  onDismiss,
}: {
  order: OrderEventPayload
  onOpen: () => void
  onDismiss: () => void
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()

  useEffect(() => {
    const timer = setTimeout(onDismiss, VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [order.id, onDismiss])

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLiveRegion="polite"
      onPress={onOpen}
      style={{
        position: 'absolute',
        top: insets.top + 8,
        left: 16,
        right: 16,
        zIndex: 10,
        elevation: 6,
        backgroundColor: theme.colors.brand600,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text weight="semibold" style={{ color: '#fff' }}>
        Nuevo pedido #{order.orderNumber}
      </Text>
      <Text variant="caption" style={{ color: '#fff' }}>
        {order.customerName} · Tocá para verlo
      </Text>
    </Pressable>
  )
}
