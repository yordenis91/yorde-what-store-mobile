import React from 'react'
import { Pressable } from 'react-native'
import { Text } from './Text'
import { useTheme } from './theme/ThemeProvider'

export interface ChipProps {
  label: string
  selected?: boolean
  disabled?: boolean
  onPress: () => void
}

/** A compact selectable pill — category filters, sort options, product variants. */
export function Chip({ label, selected = false, disabled = false, onPress }: ChipProps) {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.colors.brand600 : theme.colors.border,
        backgroundColor: selected ? theme.colors.brand50 : theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text weight={selected ? 'semibold' : undefined}>{label}</Text>
    </Pressable>
  )
}
