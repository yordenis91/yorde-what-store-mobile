import React from 'react'
import { Redirect } from 'expo-router'
import { Button, EmptyState, Screen, Spinner } from '@yws/ui'
import { useStaffAuthStore } from '@yws/shared'
import { restoreStaffSession } from '../src/hooks/useBootstrapStaffAuth'

/** Entry route: routes to login or the tab navigator once bootstrap resolves. */
export default function Index() {
  const isBootstrapping = useStaffAuthStore((s) => s.isBootstrapping)
  const accessToken = useStaffAuthStore((s) => s.accessToken)
  const refreshToken = useStaffAuthStore((s) => s.refreshToken)
  const activeTenant = useStaffAuthStore((s) => s.activeTenant)
  const clear = useStaffAuthStore((s) => s.clear)

  if (isBootstrapping) return <Spinner fullScreen />
  // A refresh token that survived bootstrap without yielding a session means
  // the api was unreachable, not that the session is gone — offer a retry.
  if (!accessToken && refreshToken) {
    return (
      <Screen>
        <EmptyState
          title="Can't reach the server"
          description="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => restoreStaffSession()}
        />
        <Button title="Sign in with another account" variant="ghost" onPress={clear} />
      </Screen>
    )
  }
  if (!accessToken) return <Redirect href="/(auth)/login" />
  if (!activeTenant) return <Redirect href="/select-tenant" />
  return <Redirect href="/(tabs)/dashboard" />
}
