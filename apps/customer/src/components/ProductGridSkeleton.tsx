import React from 'react'
import { View } from 'react-native'
import { useTheme } from '@yws/ui'

function CardSkeleton() {
  const theme = useTheme()
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: theme.colors.border }} />
      <View style={{ padding: theme.spacing.sm, gap: theme.spacing.xs }}>
        <View style={{ height: 12, borderRadius: 4, backgroundColor: theme.colors.border, width: '90%' }} />
        <View style={{ height: 12, borderRadius: 4, backgroundColor: theme.colors.border, width: '60%' }} />
        <View style={{ height: 14, borderRadius: 4, backgroundColor: theme.colors.border, width: '40%', marginTop: theme.spacing.xs / 2 }} />
      </View>
    </View>
  )
}

/** Shown while the first page of products is loading — same card shape as ProductCard so the grid doesn't jump when real content arrives. */
export function ProductGridSkeleton({ rows = 3 }: { rows?: number }) {
  const theme = useTheme()
  return (
    <View style={{ gap: theme.spacing.md }} accessibilityLabel="Cargando productos" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ))}
    </View>
  )
}
