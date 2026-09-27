import React, { useState } from 'react'
import { FlatList, Pressable } from 'react-native'
import { router } from 'expo-router'
import { Card, EmptyState, Screen, Spinner, Text } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'
import { staffApi } from '../src/lib/api'

/** Shown after login when the user belongs to more than one tenant (or none yet is active). */
export default function SelectTenantScreen() {
  const tenants = useStaffAuthStore((s) => s.tenants)
  const setActiveTenant = useStaffAuthStore((s) => s.setActiveTenant)
  const setSession = useStaffAuthStore((s) => s.setSession)
  const user = useStaffAuthStore((s) => s.user)
  const [switching, setSwitching] = useState(false)

  async function selectTenant(tenantId: string) {
    setSwitching(true)
    try {
      const result = await staffApi.auth.switchTenant(tenantId)
      setSession(result)
      const tenant = tenants.find((t) => t.id === tenantId) ?? null
      setActiveTenant(tenant)
      router.replace('/(tabs)/dashboard')
    } finally {
      setSwitching(false)
    }
  }

  if (switching) return <Spinner fullScreen />

  if (tenants.length === 0) {
    return (
      <Screen>
        <EmptyState title="No stores yet" description={`Hi ${user?.name ?? ''}, you're not a member of any store yet.`} />
      </Screen>
    )
  }

  return (
    <Screen>
      <Text variant="title" style={{ marginBottom: 16 }}>
        Choose a store
      </Text>
      <FlatList
        data={tenants}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => selectTenant(item.id)}>
            <Card>
              <Text weight="semibold">{item.name}</Text>
              <Text color="muted" variant="caption">
                {item.myRole ?? 'STAFF'}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  )
}
