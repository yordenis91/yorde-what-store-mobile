import React from 'react'
import { Pressable, View } from 'react-native'
import { Text, useTheme } from '@yws/ui'
import { STOREFRONT_THEME_LABEL } from '@yws/shared'
import { DEFAULT_THEME, STOREFRONT_THEMES, THEME_NAMES } from '@yws/tokens'

/**
 * The storefront's accent colour. Each swatch paints itself with the theme it
 * selects — same set and same order as the web settings page, since both read
 * `packages/tokens`'s mirror of the client's theme list.
 */
export function ThemePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | undefined
  onChange: (theme: string) => void
  disabled?: boolean
}) {
  const theme = useTheme()
  const active = value && value in STOREFRONT_THEMES ? value : DEFAULT_THEME

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {THEME_NAMES.map((name) => {
        const isActive = active === name
        return (
          <Pressable
            key={name}
            disabled={disabled}
            onPress={() => onChange(name)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isActive, disabled }}
            accessibilityLabel={STOREFRONT_THEME_LABEL[name] ?? name}
            style={{
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: isActive ? theme.colors.text : theme.colors.border,
              backgroundColor: isActive ? theme.colors.background : theme.colors.surface,
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: theme.radius.full,
                backgroundColor: STOREFRONT_THEMES[name][500],
              }}
            />
            <Text variant="caption" weight={isActive ? 'semibold' : 'regular'} color={isActive ? 'default' : 'muted'}>
              {STOREFRONT_THEME_LABEL[name] ?? name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
