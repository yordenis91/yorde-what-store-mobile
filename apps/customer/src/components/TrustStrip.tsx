import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@yws/ui'
import { DEFAULT_TRUST_BADGES, TRUST_BADGE_KEYS, type TrustBadgeKey, type TrustBadges } from '@yws/shared'

const ICONS: Record<TrustBadgeKey, React.ComponentProps<typeof Ionicons>['name']> = {
  shipping: 'bicycle-outline',
  payment: 'shield-checkmark-outline',
  delivery: 'flash-outline',
}

/** Per-tenant: each badge can be turned off or have its text edited from the store's settings. */
export function TrustStrip({ trustBadges }: { trustBadges: TrustBadges | null | undefined }) {
  const theme = useTheme()
  const badges = trustBadges ?? DEFAULT_TRUST_BADGES
  const visible = TRUST_BADGE_KEYS.map((key) => ({ key, ...badges[key] })).filter((b) => b.enabled && b.text)

  if (visible.length === 0) return null

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.brand50,
      }}
    >
      {visible.map((badge) => (
        <View key={badge.key} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Ionicons name={ICONS[badge.key]} size={14} color={theme.colors.brand600} />
          <Text variant="caption" weight="medium" style={{ color: theme.colors.brand700 }}>
            {badge.text}
          </Text>
        </View>
      ))}
    </View>
  )
}
