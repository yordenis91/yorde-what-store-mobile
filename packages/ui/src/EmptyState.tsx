import React from 'react'
import { View } from 'react-native'
import { Text } from './Text'
import { Button } from './Button'
import { useTheme } from './theme/ThemeProvider'

export interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

/** Used for empty lists (no products, no orders yet) and full-screen error fallbacks alike. */
export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing.xl }}>
      <Text variant="subtitle" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {description ? (
        <Text color="muted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.md }}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  )
}
