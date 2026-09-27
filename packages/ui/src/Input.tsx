import React, { forwardRef } from 'react'
import { TextInput, TextInputProps, View } from 'react-native'
import { Text } from './Text'
import { useTheme } from './theme/ThemeProvider'

export interface InputProps extends TextInputProps {
  label?: string
  error?: string | null
}

export const Input = forwardRef<TextInput, InputProps>(function Input({ label, error, style, ...rest }, ref) {
  const theme = useTheme()
  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text variant="caption" weight="medium">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.sm,
            paddingVertical: theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            fontSize: theme.typography.size.md,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  )
})
