import React from 'react'
import { RefreshControl } from 'react-native'
import { Input, Screen, ToggleRow } from '@yws/ui'
import { ReadOnlyNotice, SaveBar, SettingsPlaceholder, SettingsSection, useSettingsSection } from '../../src/components/settings'

export default function GeneralSettingsScreen() {
  const form = useSettingsSection((tenant) => ({
    name: tenant.name,
    tagline: tenant.tagline ?? '',
    currencySymbol: tenant.currencySymbol,
    tracksInventory: tenant.tracksInventory,
  }))

  if (!form.values)
    return <SettingsPlaceholder isLoading={form.isLoading} error={form.error} onRetry={form.refetch} />
  const values = form.values

  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={form.isRefetching} onRefresh={form.refetch} />}
    >
      {form.canEdit ? null : <ReadOnlyNotice role={form.tenant?.myRole} />}
      <SettingsSection title="General">
        <Input
          label="Nombre de la tienda"
          value={values.name}
          editable={form.canEdit}
          onChangeText={(name) => form.patch({ name })}
        />
        <Input
          label="Lema"
          placeholder="Lo que tu tienda hace, en una línea"
          value={values.tagline}
          editable={form.canEdit}
          onChangeText={(tagline) => form.patch({ tagline })}
        />
        <Input
          label="Símbolo de moneda"
          value={values.currencySymbol}
          editable={form.canEdit}
          onChangeText={(currencySymbol) => form.patch({ currencySymbol })}
          style={{ maxWidth: 120 }}
        />
      </SettingsSection>

      <SettingsSection
        title="Inventario"
        hint="Desactivado por defecto. Activalo solo si mantenés al día las cantidades de tus productos: con esto activo, un pedido que supere el stock se rechaza."
      >
        <ToggleRow
          label="Controlar stock en esta tienda"
          value={values.tracksInventory}
          disabled={!form.canEdit}
          onChange={(tracksInventory) => form.patch({ tracksInventory })}
        />
      </SettingsSection>

      <SaveBar
        canEdit={form.canEdit}
        saving={form.isSaving}
        error={form.error}
        saved={form.saved}
        onPress={() =>
          form.save(
            {
              name: values.name.trim(),
              tagline: values.tagline.trim() || null,
              currencySymbol: values.currencySymbol.trim(),
              tracksInventory: values.tracksInventory,
            },
            (v) => {
              if (v.name.trim().length < 2) return 'Ingresá el nombre de la tienda (al menos 2 caracteres)'
              if (!v.currencySymbol.trim()) return 'Ingresá el símbolo de moneda'
              return null
            },
          )
        }
      />
    </Screen>
  )
}
