import React from 'react'
import { View } from 'react-native'
import { useNetInfo } from '@react-native-community/netinfo'
import { Text, useTheme } from '@yws/ui'

/** Shown while the phone has no connection, so saved data on screen isn't mistaken for live data. */
export function OfflineBanner() {
  const theme = useTheme()
  const { isConnected } = useNetInfo()
  if (isConnected !== false) return null

  return (
    <View
      accessibilityRole="alert"
      style={{ backgroundColor: theme.colors.text, paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.lg }}
    >
      <Text variant="caption" weight="medium" style={{ color: theme.colors.surface, textAlign: 'center' }}>
        Sin conexión · mostrando datos guardados
      </Text>
    </View>
  )
}
