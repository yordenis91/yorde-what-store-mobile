import React from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text, useTheme } from '@yws/ui'

/**
 * Fixed copy for now — the tenant model has no field yet for a store to turn
 * these on/off or edit the wording, so this always shows the same three
 * items rather than pretending to be per-tenant configurable. Needs a
 * backend addition (e.g. `tenant.trustBadges`) before it can really be that.
 */
const ITEMS: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { icon: 'bicycle-outline', label: 'Envío gratis' },
  { icon: 'shield-checkmark-outline', label: 'Pago seguro' },
  { icon: 'flash-outline', label: 'Entrega rápida' },
]

export function TrustStrip() {
  const theme = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: theme.colors.brand50,
      }}
    >
      {ITEMS.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={item.icon} size={14} color={theme.colors.brand600} />
          <Text variant="caption" weight="medium" style={{ color: theme.colors.brand700 }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  )
}
