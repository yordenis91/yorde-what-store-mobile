import React from 'react'
import { View, ViewProps } from 'react-native'
import { useTheme } from './theme/ThemeProvider'

export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  )
}
