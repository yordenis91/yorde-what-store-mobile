import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@yws/ui'
import type { TrustBadgeKey, TrustBadges } from '@yws/shared'

const ICONS: Record<TrustBadgeKey, React.ComponentProps<typeof Ionicons>['name']> = {
  shipping: 'bicycle-outline',
  payment: 'shield-checkmark-outline',
  delivery: 'flash-outline',
}

/** Matches the api's default `trust_badges` column — what every storefront showed before this was configurable, used when a tenant hasn't set the field at all (e.g. a stale cached PublicTenant). */
const DEFAULTS: TrustBadges = {
  shipping: { enabled: true, text: 'Envío gratis' },
  payment: { enabled: true, text: 'Pago seguro' },
  delivery: { enabled: true, text: 'Entrega rápida' },
}

const ORDER: TrustBadgeKey[] = ['shipping', 'payment', 'delivery']

/** Per-tenant: each badge can be turned off or have its text edited from the store's settings. */
export function TrustStrip({ trustBadges }: { trustBadges: TrustBadges | null | undefined }) {
  const theme = useTheme()
  const badges = trustBadges ?? DEFAULTS
  const visible = ORDER.map((key) => ({ key, ...badges[key] })).filter((b) => b.enabled && b.text)

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
