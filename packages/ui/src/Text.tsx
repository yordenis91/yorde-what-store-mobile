import React from 'react'
import { Text as RNText, TextProps as RNTextProps } from 'react-native'
import { useTheme } from './theme/ThemeProvider'

export interface TextProps extends RNTextProps {
  variant?: 'title' | 'subtitle' | 'body' | 'caption'
  color?: 'default' | 'muted' | 'danger' | 'success'
  weight?: 'regular' | 'medium' | 'semibold' | 'bold'
}

export function Text({ variant = 'body', color = 'default', weight, style, ...rest }: TextProps) {
  const theme = useTheme()
  const sizeByVariant = {
    title: theme.typography.size['2xl'],
    subtitle: theme.typography.size.lg,
    body: theme.typography.size.md,
    caption: theme.typography.size.sm,
  } as const
  const defaultWeightByVariant = {
    title: 'bold',
    subtitle: 'semibold',
    body: 'regular',
    caption: 'regular',
  } as const
  const colorMap = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    danger: theme.colors.danger,
    success: theme.colors.success,
  } as const

  return (
    <RNText
      style={[
        {
          fontSize: sizeByVariant[variant],
          fontWeight: theme.typography.weight[weight ?? defaultWeightByVariant[variant]],
          color: colorMap[color],
        },
        style,
      ]}
      {...rest}
    />
  )
}
