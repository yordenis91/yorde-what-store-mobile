import React from 'react'
import { Switch, View } from 'react-native'
import { Text } from './Text'
import { useTheme } from './theme/ThemeProvider'

export interface ToggleRowProps {
  label: string
  hint?: string
  value: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

/** A labelled switch with an optional explanation — the row every settings screen uses for a boolean. */
export function ToggleRow({ label, hint, value, onChange, disabled }: ToggleRowProps) {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, opacity: disabled ? 0.6 : 1 }}>
      <View style={{ flex: 1 }}>
        <Text weight="semibold">{label}</Text>
        {hint ? (
          <Text color="muted" variant="caption">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  )
}
