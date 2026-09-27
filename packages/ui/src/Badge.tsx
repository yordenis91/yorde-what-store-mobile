import React from 'react'
import { View } from 'react-native'
import { Text } from './Text'
import { useTheme } from './theme/ThemeProvider'

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const theme = useTheme()
  const toneMap = {
    neutral: { bg: theme.colors.border, fg: theme.colors.text },
    success: { bg: theme.colors.successBg, fg: theme.colors.success },
    warning: { bg: theme.colors.warningBg, fg: theme.colors.warning },
    danger: { bg: theme.colors.dangerBg, fg: theme.colors.danger },
    info: { bg: theme.colors.infoBg, fg: theme.colors.info },
  } as const
  const { bg, fg } = toneMap[tone]
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: theme.radius.full,
        paddingVertical: theme.spacing.xs / 2,
        paddingHorizontal: theme.spacing.sm,
      }}
    >
      <Text variant="caption" weight="semibold" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  )
}
