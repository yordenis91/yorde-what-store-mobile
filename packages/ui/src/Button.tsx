import React from 'react'
import { ActivityIndicator, Pressable, PressableProps } from 'react-native'
import { Text } from './Text'
import { useTheme } from './theme/ThemeProvider'

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme()
  const isDisabled = disabled || loading

  const backgroundByVariant = {
    primary: theme.colors.brand600,
    secondary: theme.colors.surface,
    danger: theme.colors.danger,
    ghost: 'transparent',
  } as const
  const textColorByVariant = {
    primary: '#ffffff',
    secondary: theme.colors.text,
    danger: '#ffffff',
    ghost: theme.colors.brand600,
  } as const

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        {
          backgroundColor: backgroundByVariant[variant],
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isDisabled ? 0.6 : state.pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColorByVariant[variant]} />
      ) : (
        <Text weight="semibold" style={{ color: textColorByVariant[variant] }}>
          {title}
        </Text>
      )}
    </Pressable>
  )
}
