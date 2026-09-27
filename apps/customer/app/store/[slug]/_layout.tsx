import React, { useEffect } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { EmptyState, Screen, Spinner, ThemeProvider } from '@yws/ui'
import { useCartStore, useCustomerAuthStore } from '@yws/shared'
import { useTenant } from '../../../src/hooks/queries'

/**
 * Resolves the tenant for this slug, re-themes the subtree to its brand
 * colour (see `packages/ui/src/theme/ThemeProvider.tsx`), and keeps the cart
 * and customer-session stores pinned to this slug — switching stores (a new
 * deep link, or the account screen's "switch store") clears both, same as
 * the web client's `/store/:slug` fallback mode.
 */
export default function StoreLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: tenant, isLoading, isError } = useTenant(slug)
  const setCartTenantSlug = useCartStore((s) => s.setTenantSlug)
  const setAuthTenantSlug = useCustomerAuthStore((s) => s.setTenantSlug)

  useEffect(() => {
    if (slug) {
      setCartTenantSlug(slug)
      setAuthTenantSlug(slug)
    }
  }, [slug, setCartTenantSlug, setAuthTenantSlug])

  if (isLoading) return <Spinner fullScreen />
  if (isError || !tenant) {
    return (
      <Screen>
        <EmptyState title="Store not found" description={`No active store at "${slug}".`} />
      </Screen>
    )
  }

  return (
    <ThemeProvider tenantThemeName={tenant.theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
