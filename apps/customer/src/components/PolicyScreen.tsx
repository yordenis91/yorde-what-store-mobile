import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Screen, Text } from '@yws/ui'
import { useTenant } from '../hooks/queries'
import { STORE_POLICIES, type PolicyKey } from '../lib/policies'

/** One of the store's policies, shown as plain text exactly as the merchant wrote it (same as the web). */
export function PolicyScreen({ policyKey }: { policyKey: PolicyKey }) {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: tenant } = useTenant(slug)
  const title = STORE_POLICIES.find((p) => p.key === policyKey)?.title ?? ''
  const content = tenant?.[policyKey]?.trim()

  return (
    <Screen scroll>
      <Text variant="title" style={{ marginBottom: 16 }}>
        {title}
      </Text>
      {content ? (
        <Text style={{ lineHeight: 22 }}>{content}</Text>
      ) : (
        <Text color="muted">{tenant?.name ?? 'La tienda'} todavía no publicó esta política.</Text>
      )}
    </Screen>
  )
}
