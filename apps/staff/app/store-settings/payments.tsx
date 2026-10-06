import React, { useEffect, useState } from 'react'
import { RefreshControl } from 'react-native'
import { Badge, Input, Screen, Spinner, Text, ToggleRow, useTheme } from '@yws/ui'
import {
  extractErrorMessage,
  paymentCredentialsError,
  useStaffAuthStore,
  type PaymentProvider,
  type UpsertPaymentSetting,
} from '@yws/shared'
import {
  PlanLockedNotice,
  ReadOnlyNotice,
  SaveBar,
  SettingsPlaceholder,
  SettingsSection,
} from '../../src/components/settings'
import { useIsStoreOwner, usePaymentSettings, useUpsertPaymentSetting, useZelleRecipient } from '../../src/hooks/queries'

/**
 * Payment methods. Unlike the other settings sections these don't go through
 * `PATCH /tenants/current` but through `PUT /tenants/current/payment-settings`,
 * one provider per save.
 *
 * That endpoint **replaces** the provider's encrypted credentials with
 * whatever it receives and never returns them, so every form here refuses to
 * save an incomplete credential set (`paymentCredentialsError`) instead of
 * quietly blanking working keys — which is what the web panel does today.
 * Zelle is the exception that can be prefilled: its "credentials" are the
 * recipient a customer pays, public by design on the storefront.
 */
export default function PaymentsSettingsScreen() {
  const canEdit = useIsStoreOwner()
  const role = useStaffAuthStore((s) => s.activeTenant?.myRole)
  const settings = usePaymentSettings()

  if (!canEdit) {
    return (
      <Screen scroll>
        <ReadOnlyNotice role={role} />
        <SettingsSection title="Métodos de pago">
          <Text color="muted">
            La configuración de pagos solo la puede ver y cambiar el dueño de la tienda.
          </Text>
        </SettingsSection>
      </Screen>
    )
  }

  if (settings.isLoading) return <Spinner fullScreen />
  // With no data at all there's nothing honest to render: a form with "Sin
  // activar" badges would claim the store has no payment method set up.
  if (settings.error && !settings.data)
    return (
      <SettingsPlaceholder
        isLoading={false}
        error={extractErrorMessage(settings.error, 'No pudimos cargar los métodos de pago.')}
        onRetry={() => void settings.refetch()}
      />
    )

  const isEnabled = (provider: PaymentProvider) =>
    settings.data?.some((setting) => setting.provider === provider && setting.isEnabled) ?? false

  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={settings.isRefetching} onRefresh={() => void settings.refetch()} />}
    >
      {settings.error ? (
        <Text color="danger" style={{ marginBottom: 12 }}>
          {extractErrorMessage(settings.error, 'No pudimos cargar los métodos de pago.')}
        </Text>
      ) : null}
      <ZelleForm enabled={isEnabled('ZELLE')} />
      <StripeForm enabled={isEnabled('STRIPE')} />
      <MercadoPagoForm enabled={isEnabled('MERCADOPAGO')} />
    </Screen>
  )
}

/** Shared save plumbing: validate the credential set, send it, report the outcome. */
function useProviderSave() {
  const upsert = useUpsertPaymentSetting()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  return {
    isSaving: upsert.isPending,
    error,
    saved,
    reset: () => {
      setError(null)
      setSaved(false)
    },
    save: (payload: UpsertPaymentSetting) => {
      const invalid = paymentCredentialsError(payload)
      setSaved(false)
      setError(invalid)
      if (invalid) return
      upsert.mutate(payload, {
        onSuccess: () => setSaved(true),
        onError: (err) => setError(extractErrorMessage(err, 'No pudimos guardar el método de pago.')),
      })
    },
  }
}

function EnabledBadge({ enabled, label }: { enabled: boolean; label: string }) {
  return enabled ? <Badge label={`${label} activo`} tone="success" /> : <Badge label="Sin activar" tone="neutral" />
}

function ZelleForm({ enabled }: { enabled: boolean }) {
  const theme = useTheme()
  const slug = useStaffAuthStore((s) => s.activeTenant?.slug)
  const recipient = useZelleRecipient(slug)
  const saver = useProviderSave()
  const [values, setValues] = useState({
    isEnabled: enabled,
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    instructions: '',
  })

  // Seeded from the storefront projection — the only place the api hands the
  // recipient back — so editing one field doesn't wipe the others on save.
  useEffect(() => {
    setValues({
      isEnabled: enabled,
      recipientName: recipient.data?.recipientName ?? '',
      recipientEmail: recipient.data?.recipientEmail ?? '',
      recipientPhone: recipient.data?.recipientPhone ?? '',
      instructions: recipient.data?.instructions ?? '',
    })
  }, [enabled, recipient.data])

  function patch(changes: Partial<typeof values>) {
    saver.reset()
    setValues((current) => ({ ...current, ...changes }))
  }

  return (
    <>
      <SettingsSection title="Zelle">
        <EnabledBadge enabled={enabled} label="Zelle" />
        <PlanLockedNotice method="ZELLE" />
        <ToggleRow
          label="Habilitar pago por Zelle"
          hint="El cliente transfiere y sube el comprobante; la tienda lo confirma a mano."
          value={values.isEnabled}
          onChange={(isEnabled) => patch({ isEnabled })}
        />
        {recipient.isLoading ? <Spinner /> : null}
        <Input
          label="Nombre del destinatario"
          value={values.recipientName}
          onChangeText={(recipientName) => patch({ recipientName })}
        />
        <Input
          label="Correo o teléfono de Zelle"
          placeholder="pagos@tutienda.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={values.recipientEmail}
          onChangeText={(recipientEmail) => patch({ recipientEmail })}
        />
        <Input
          label="Teléfono (opcional)"
          keyboardType="phone-pad"
          value={values.recipientPhone}
          onChangeText={(recipientPhone) => patch({ recipientPhone })}
        />
        <Input
          label="Instrucciones de pago"
          placeholder="Ej: enviá el monto exacto e incluí tu número de pedido."
          multiline
          numberOfLines={3}
          value={values.instructions}
          onChangeText={(instructions) => patch({ instructions })}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <Text color="muted" variant="caption" style={{ marginTop: theme.spacing.xs }}>
          Estos datos son los que ve tu cliente al pagar, así que la app los puede mostrar y precargar.
        </Text>
      </SettingsSection>
      <SaveBar
        canEdit
        saving={saver.isSaving}
        error={saver.error}
        saved={saver.saved}
        title="Guardar Zelle"
        onPress={() =>
          saver.save({
            provider: 'ZELLE',
            isEnabled: values.isEnabled,
            credentials: {
              recipientName: values.recipientName.trim(),
              recipientEmail: values.recipientEmail.trim(),
              recipientPhone: values.recipientPhone.trim(),
              instructions: values.instructions.trim(),
            },
          })
        }
      />
    </>
  )
}

function StripeForm({ enabled }: { enabled: boolean }) {
  const saver = useProviderSave()
  const [values, setValues] = useState({ isEnabled: enabled, publishableKey: '', secretKey: '' })
  useEffect(() => setValues((current) => ({ ...current, isEnabled: enabled })), [enabled])

  function patch(changes: Partial<typeof values>) {
    saver.reset()
    setValues((current) => ({ ...current, ...changes }))
  }

  return (
    <>
      <SettingsSection
        title="Stripe"
        hint="La API nunca devuelve las claves guardadas y cada guardado las reemplaza: escribí las dos completas, también para desactivar Stripe."
      >
        <EnabledBadge enabled={enabled} label="Stripe" />
        <PlanLockedNotice method="STRIPE" />
        <ToggleRow
          label="Habilitar pago con tarjeta"
          value={values.isEnabled}
          onChange={(isEnabled) => patch({ isEnabled })}
        />
        <Input
          label="Clave publicable"
          placeholder="pk_live_..."
          autoCapitalize="none"
          value={values.publishableKey}
          onChangeText={(publishableKey) => patch({ publishableKey })}
        />
        <Input
          label="Clave secreta"
          placeholder="sk_live_..."
          autoCapitalize="none"
          secureTextEntry
          value={values.secretKey}
          onChangeText={(secretKey) => patch({ secretKey })}
        />
      </SettingsSection>
      <SaveBar
        canEdit
        saving={saver.isSaving}
        error={saver.error}
        saved={saver.saved}
        title="Guardar Stripe"
        onPress={() =>
          saver.save({
            provider: 'STRIPE',
            isEnabled: values.isEnabled,
            credentials: { publishableKey: values.publishableKey.trim(), secretKey: values.secretKey.trim() },
          })
        }
      />
    </>
  )
}

function MercadoPagoForm({ enabled }: { enabled: boolean }) {
  const saver = useProviderSave()
  const [values, setValues] = useState({ isEnabled: enabled, accessToken: '' })
  useEffect(() => setValues((current) => ({ ...current, isEnabled: enabled })), [enabled])

  function patch(changes: Partial<typeof values>) {
    saver.reset()
    setValues((current) => ({ ...current, ...changes }))
  }

  return (
    <>
      <SettingsSection
        title="MercadoPago"
        hint="Igual que Stripe: el access token no se puede leer de vuelta y cada guardado lo reemplaza."
      >
        <EnabledBadge enabled={enabled} label="MercadoPago" />
        <PlanLockedNotice method="MERCADOPAGO" />
        <ToggleRow
          label="Habilitar MercadoPago"
          value={values.isEnabled}
          onChange={(isEnabled) => patch({ isEnabled })}
        />
        <Input
          label="Access token"
          placeholder="APP_USR-..."
          autoCapitalize="none"
          secureTextEntry
          value={values.accessToken}
          onChangeText={(accessToken) => patch({ accessToken })}
        />
      </SettingsSection>
      <SaveBar
        canEdit
        saving={saver.isSaving}
        error={saver.error}
        saved={saver.saved}
        title="Guardar MercadoPago"
        onPress={() =>
          saver.save({
            provider: 'MERCADOPAGO',
            isEnabled: values.isEnabled,
            credentials: { accessToken: values.accessToken.trim() },
          })
        }
      />
    </>
  )
}
