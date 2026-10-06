import React from 'react'
import { Pressable, View } from 'react-native'
import { Card, Text, useTheme } from '@yws/ui'

/** One row of the settings hub: where it goes and what lives there. */
export function SettingsLink({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  const theme = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <Card style={{ opacity: pressed ? 0.7 : 1, paddingVertical: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text weight="semibold">{title}</Text>
              <Text color="muted" variant="caption">
                {hint}
              </Text>
            </View>
            <Text color="muted" variant="subtitle">
              ›
            </Text>
          </View>
        </Card>
      )}
    </Pressable>
  )
}
