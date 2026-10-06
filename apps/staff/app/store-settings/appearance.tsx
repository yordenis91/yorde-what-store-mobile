import React from 'react'
import { RefreshControl } from 'react-native'
import { Screen } from '@yws/ui'
import {
  ImageUploadField,
  ReadOnlyNotice,
  SaveBar,
  SettingsPlaceholder,
  SettingsSection,
  ThemePicker,
  useSettingsSection,
} from '../../src/components/settings'

export default function AppearanceSettingsScreen() {
  const form = useSettingsSection((tenant) => ({
    logoUrl: tenant.logoUrl,
    bannerUrl: tenant.bannerUrl,
    invoiceLogoUrl: tenant.invoiceLogoUrl,
    theme: tenant.theme,
  }))

  if (!form.values)
    return <SettingsPlaceholder isLoading={form.isLoading} error={form.error} onRetry={form.refetch} />
  const values = form.values

  return (
    <Screen scroll refreshControl={<RefreshControl refreshing={form.isRefetching} onRefresh={form.refetch} />}>
      {form.canEdit ? null : <ReadOnlyNotice role={form.tenant?.myRole} />}
      <SettingsSection
        title="Apariencia"
        hint="Una imagen se sube al elegirla, pero no se aplica a la tienda hasta que guardás."
      >
        <ImageUploadField
          label="Logo"
          hint="Se muestra en la cabecera y junto al nombre de tu tienda."
          value={values.logoUrl}
          onChange={(logoUrl) => form.patch({ logoUrl })}
          uploadType="logo"
          disabled={!form.canEdit}
        />
        <ImageUploadField
          label="Banner de cabecera"
          hint="Imagen ancha detrás de la cabecera. Sin ella se usa un degradado con el color de tu tema."
          value={values.bannerUrl}
          onChange={(bannerUrl) => form.patch({ bannerUrl })}
          uploadType="banner"
          shape="wide"
          disabled={!form.canEdit}
        />
      </SettingsSection>

      <SettingsSection title="Color de la tienda" hint="El color de acento que ven tus clientes en toda la tienda.">
        <ThemePicker value={values.theme} onChange={(theme) => form.patch({ theme })} disabled={!form.canEdit} />
      </SettingsSection>

      <SettingsSection title="Facturación">
        <ImageUploadField
          label="Logo de factura"
          hint="Se imprime arriba en la factura PDF de los pagos con tarjeta. Vacío usa el logo de la tienda."
          value={values.invoiceLogoUrl}
          onChange={(invoiceLogoUrl) => form.patch({ invoiceLogoUrl })}
          uploadType="logo"
          disabled={!form.canEdit}
        />
      </SettingsSection>

      <SaveBar
        canEdit={form.canEdit}
        saving={form.isSaving}
        error={form.error}
        saved={form.saved}
        onPress={() =>
          form.save({
            logoUrl: values.logoUrl,
            bannerUrl: values.bannerUrl,
            invoiceLogoUrl: values.invoiceLogoUrl,
            theme: values.theme,
          })
        }
      />
    </Screen>
  )
}
