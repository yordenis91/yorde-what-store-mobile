import React from 'react'
import { View } from 'react-native'
import { Text, useTheme } from '@yws/ui'
import { TENANT_ROLE_LABEL, type FulfillmentMethod, type TenantMemberRole } from '@yws/shared'
import { usePlanEntitlements } from '../../hooks/queries'

function Notice({ tone, children }: { tone: 'info' | 'warning'; children: React.ReactNode }) {
  const theme = useTheme()
  const background = tone === 'info' ? theme.colors.infoBg : theme.colors.warningBg
  const color = tone === 'info' ? theme.colors.info : theme.colors.warning
  return (
    <View
      style={{
        backgroundColor: background,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
      }}
    >
      <Text variant="caption" style={{ color }}>
        {children}
      </Text>
    </View>
  )
}

/**
 * Why the fields are read-only. Shown instead of letting a collaborator fill
 * a form the api will refuse: `PATCH /tenants/current` and the payment
 * settings endpoints are `@Roles('OWNER')`.
 */
export function ReadOnlyNotice({ role }: { role: TenantMemberRole | undefined }) {
  return (
    <Notice tone="info">
      Solo el dueño de la tienda puede cambiar esta configuración. Tu rol es{' '}
      {TENANT_ROLE_LABEL[role ?? 'STAFF']}: podés ver los valores actuales.
    </Notice>
  )
}

/**
 * The api refuses to switch on a channel the plan doesn't include
 * (`PlansService.assertFulfillmentMethodAllowed`, only on the off → on
 * transition). This says so before the save fails. Changing plan isn't in the
 * app yet, so it points at the web panel rather than a dead end.
 */
export function PlanLockedNotice({ method }: { method: FulfillmentMethod }) {
  const entitlements = usePlanEntitlements()
  if (!entitlements.data || entitlements.data.fulfillmentMethods.includes(method)) return null
  return <Notice tone="warning">No incluido en tu plan actual. Mejoralo desde el panel web para poder activarlo.</Notice>
}
