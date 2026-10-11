import React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { Input, Text, useTheme } from '@yws/ui'
import type { ProductCategory } from '@yws/shared'

export type SortOption = 'newest' | 'price_asc' | 'price_desc'

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Más recientes',
  price_asc: 'Precio: de menor a mayor',
  price_desc: 'Precio: de mayor a menor',
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{
        paddingVertical: 6,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: active ? theme.colors.brand600 : theme.colors.border,
        backgroundColor: active ? theme.colors.brand50 : theme.colors.surface,
      }}
    >
      <Text variant="caption" weight="medium" style={{ color: active ? theme.colors.brand600 : theme.colors.text }}>
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * Search + category + sort row — rendered as the second element of a
 * two-part ListHeaderComponent array with `stickyHeaderIndices={[1]}` on the
 * screen's FlatList, so this is the part that sticks once the banner above
 * it scrolls away. Needs its own opaque background for that to look right
 * mid-scroll.
 */
export function StorefrontFilters({
  search,
  onSearchChange,
  categories,
  categoryId,
  onSelectCategory,
  sort,
  onSelectSort,
}: {
  search: string
  onSearchChange: (value: string) => void
  categories: ProductCategory[]
  categoryId: string | undefined
  onSelectCategory: (id: string | undefined) => void
  sort: SortOption
  onSelectSort: (sort: SortOption) => void
}) {
  const theme = useTheme()
  return (
    <View style={{ backgroundColor: theme.colors.background, paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm, gap: theme.spacing.sm }}>
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <Input placeholder="Buscar productos" value={search} onChangeText={onSearchChange} accessibilityLabel="Buscar productos" />
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}
        >
          <Chip label="Todas" active={categoryId === undefined} onPress={() => onSelectCategory(undefined)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => onSelectCategory(c.id)} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}
      >
        {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
          <Chip key={key} label={SORT_LABELS[key]} active={sort === key} onPress={() => onSelectSort(key)} />
        ))}
      </ScrollView>
    </View>
  )
}
