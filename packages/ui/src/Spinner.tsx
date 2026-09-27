import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useTheme } from './theme/ThemeProvider'

export function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  const theme = useTheme()
  if (!fullScreen) return <ActivityIndicator color={theme.colors.brand600} />
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator color={theme.colors.brand600} size="large" />
    </View>
  )
}
