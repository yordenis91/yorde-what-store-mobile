import React, { useEffect } from 'react'
import { Stack, useLocalSearchParams } from 'expo-router'
import { EmptyState, Screen, Spinner, ThemeProvider } from '@yws/ui'
import { useCartStore, useCustomerAuthStore, useHasHydrated } from '@yws/shared'
import { useTenant } from '../../../src/hooks/queries'

/**
 * Resolves the tenant for this slug, re-themes the subtree to its brand
 * colour (see `packages/ui/src/theme/ThemeProvider.tsx`), and keeps the cart
 * and customer-session stores pinned to this slug — switching stores (a new
 * deep link, or the account screen's "switch store") clears both, same as
 * the web client's `/store/:slug` fallback mode.
 *
 * Nothing below renders until both stores have hydrated AND point at this
 * slug. Otherwise a deep link into store B races two things: the pin effect
 * runs after the children's first queries (sent with the previous store's
 * X-Tenant-ID, then cached under B's key), and persist's rehydration can land
 * after the pin and restore store A's slug and cart over it — leaving A's
 * cart checkoutable inside B.
 */
export default function StoreLayout() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { data: tenant, isLoading, isError } = useTenant(slug)
  const cartHydrated = useHasHydrated(useCartStore)
  const authHydrated = useHasHydrated(useCustomerAuthStore)
  const cartSlug = useCartStore((s) => s.tenantSlug)
  const authSlug = useCustomerAuthStore((s) => s.tenantSlug)
  const setCartTenantSlug = useCartStore((s) => s.setTenantSlug)
  const setAuthTenantSlug = useCustomerAuthStore((s) => s.setTenantSlug)
  const hydrated = cartHydrated && authHydrated

  useEffect(() => {
    if (hydrated && slug) {
      setCartTenantSlug(slug)
      setAuthTenantSlug(slug)
    }
  }, [hydrated, slug, setCartTenantSlug, setAuthTenantSlug])

  if (isLoading || !hydrated || cartSlug !== slug || authSlug !== slug) return <Spinner fullScreen />
  if (isError || !tenant) {
    return (
      <Screen>
        <EmptyState title="Tienda no encontrada" description={`No hay ninguna tienda activa en "${slug}".`} />
      </Screen>
    )
  }

  return (
    <ThemeProvider tenantThemeName={tenant.theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
