import React from 'react'
import { RefreshControl } from 'react-native'
import { Badge, Input, Screen, ToggleRow } from '@yws/ui'
import { ReadOnlyNotice, SaveBar, SettingsPlaceholder, SettingsSection, useSettingsSection } from '../../src/components/settings'
import type { TenantSettingsUpdate } from '@yws/shared'

export default function EmailSettingsScreen() {
  const form = useSettingsSection((tenant) => ({
    smtpEnabled: tenant.smtpEnabled,
    smtpHost: tenant.smtpHost ?? '',
    smtpPort: tenant.smtpPort ? String(tenant.smtpPort) : '',
    smtpUser: tenant.smtpUser ?? '',
    // Always blank: the api returns `smtpPasswordSet`, never the password.
    smtpPassword: '',
    smtpFrom: tenant.smtpFrom ?? '',
    smtpPasswordSet: tenant.smtpPasswordSet,
  }))

  if (!form.values)
    return <SettingsPlaceholder isLoading={form.isLoading} error={form.error} onRetry={form.refetch} />
  const values = form.values

  function onSave() {
    const changes: TenantSettingsUpdate = {
      smtpEnabled: values.smtpEnabled,
      smtpHost: values.smtpHost.trim() || null,
      smtpPort: values.smtpPort.trim() ? Number(values.smtpPort.trim()) : null,
      smtpUser: values.smtpUser.trim() || null,
      smtpFrom: values.smtpFrom.trim() || null,
    }
    // Omitted entirely keeps the stored password (see the api's
    // TenantsService.update) — sending '' would clear it.
    if (values.smtpPassword) changes.smtpPassword = values.smtpPassword
    form.save(changes, (v) => {
      if (!v.smtpEnabled) return null
      if (!v.smtpHost.trim()) return 'Ingresá el host SMTP'
      const port = Number(v.smtpPort.trim())
      if (v.smtpPort.trim() && (!Number.isInteger(port) || port < 1 || port > 65535))
        return 'El puerto tiene que ser un número entre 1 y 65535'
      if (!v.smtpPasswordSet && !v.smtpPassword) return 'Ingresá la contraseña del servidor SMTP'
      return null
    })
  }

  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={form.isRefetching} onRefresh={form.refetch} />}
    >
      {form.canEdit ? null : <ReadOnlyNotice role={form.tenant?.myRole} />}
      <SettingsSection
        title="Envío de emails (SMTP)"
        hint="Enviá confirmaciones de pedido, restablecimientos de contraseña e invitaciones de personal desde tu propio servidor de correo en vez del de la plataforma."
      >
        {values.smtpEnabled && values.smtpPasswordSet ? <Badge label="Configurado" tone="success" /> : null}
        <ToggleRow
          label="Usar mi propio servidor SMTP"
          value={values.smtpEnabled}
          disabled={!form.canEdit}
          onChange={(smtpEnabled) => form.patch({ smtpEnabled })}
        />
        {values.smtpEnabled ? (
          <>
            <Input
              label="Host SMTP"
              placeholder="smtp.example.com"
              autoCapitalize="none"
              value={values.smtpHost}
              editable={form.canEdit}
              onChangeText={(smtpHost) => form.patch({ smtpHost })}
            />
            <Input
              label="Puerto"
              placeholder="587"
              keyboardType="number-pad"
              value={values.smtpPort}
              editable={form.canEdit}
              onChangeText={(smtpPort) => form.patch({ smtpPort })}
              style={{ maxWidth: 120 }}
            />
            <Input
              label="Usuario"
              autoCapitalize="none"
              value={values.smtpUser}
              editable={form.canEdit}
              onChangeText={(smtpUser) => form.patch({ smtpUser })}
            />
            <Input
              label={values.smtpPasswordSet ? 'Contraseña (dejala vacía para no cambiarla)' : 'Contraseña'}
              placeholder={values.smtpPasswordSet ? '••••••••' : undefined}
              secureTextEntry
              autoCapitalize="none"
              value={values.smtpPassword}
              editable={form.canEdit}
              onChangeText={(smtpPassword) => form.patch({ smtpPassword })}
            />
            <Input
              label="Dirección de remitente"
              placeholder="pedidos@tutienda.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={values.smtpFrom}
              editable={form.canEdit}
              onChangeText={(smtpFrom) => form.patch({ smtpFrom })}
            />
          </>
        ) : null}
      </SettingsSection>

      <SaveBar canEdit={form.canEdit} saving={form.isSaving} error={form.error} saved={form.saved} onPress={onSave} />
    </Screen>
  )
}
