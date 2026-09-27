import React from 'react'
import { Redirect } from 'expo-router'
import { Spinner } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'

/** Entry route: routes to login or the tab navigator once bootstrap resolves. */
export default function Index() {
  const isBootstrapping = useStaffAuthStore((s) => s.isBootstrapping)
  const accessToken = useStaffAuthStore((s) => s.accessToken)
  const activeTenant = useStaffAuthStore((s) => s.activeTenant)

  if (isBootstrapping) return <Spinner fullScreen />
  if (!accessToken) return <Redirect href="/(auth)/login" />
  if (!activeTenant) return <Redirect href="/select-tenant" />
  return <Redirect href="/(tabs)/dashboard" />
}
