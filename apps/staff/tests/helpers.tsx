import React from 'react'
import { render } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useStaffAuthStore, type Tenant, type TenantMemberRole } from '@yws/shared'

/** A complete tenant, so a screen's mapper never trips over a field the test forgot. */
export function tenantFixture(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-1',
    ownerId: 'user-owner',
    name: 'Tienda de prueba',
    slug: 'tienda-de-prueba',
    subdomain: null,
    tagline: null,
    about: null,
    currency: 'USD',
    currencySymbol: '$',
    currencySymbolPosition: 'before',
    locale: 'es',
    logoUrl: null,
    bannerUrl: null,
    invoiceLogoUrl: null,
    theme: 'default',
    tracksInventory: false,
    whatsappEnabled: false,
    whatsappNumber: null,
    telegramEnabled: false,
    telegramBotToken: null,
    telegramChatId: null,
    orderMessageTemplate: '',
    termsOfSaleContent: null,
    shippingPolicyContent: null,
    returnPolicyContent: null,
    privacyPolicyContent: null,
    smtpEnabled: false,
    smtpHost: null,
    smtpPort: null,
    smtpUser: null,
    smtpFrom: null,
    smtpPasswordSet: false,
    socialLinks: {},
    trustBadges: {} as Tenant['trustBadges'],
    isActive: true,
    status: 'ACTIVE' as Tenant['status'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Puts the session in the state a logged-in user with `role` in the active store would have. */
export function signInAs(role: TenantMemberRole) {
  const tenant = tenantFixture({ myRole: role })
  useStaffAuthStore.setState({
    user: { id: 'user-1', name: 'Ana', email: 'ana@tienda.test' } as never,
    accessToken: 'token',
    activeTenant: tenant,
    tenants: [tenant],
  })
  return tenant
}

export function renderScreen(Screen: React.ComponentType) {
  // No retries and no cache time: a failing request must show up in the test, not 3 retries later.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <Screen />
    </QueryClientProvider>,
  )
}
