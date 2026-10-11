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
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
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
    <View style={{ backgroundColor: theme.colors.background, paddingTop: 10, paddingBottom: 8, gap: 8 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Input placeholder="Buscar productos" value={search} onChangeText={onSearchChange} />
      </View>

      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Chip label="Todas" active={categoryId === undefined} onPress={() => onSelectCategory(undefined)} />
          {categories.map((c) => (
            <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => onSelectCategory(c.id)} />
          ))}
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
          <Chip key={key} label={SORT_LABELS[key]} active={sort === key} onPress={() => onSelectSort(key)} />
        ))}
      </ScrollView>
    </View>
  )
}
