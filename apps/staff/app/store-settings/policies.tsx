import React from 'react'
import { RefreshControl, View } from 'react-native'
import { Input, Screen, Text } from '@yws/ui'
import { ReadOnlyNotice, SaveBar, SettingsPlaceholder, SettingsSection, useSettingsSection } from '../../src/components/settings'

const POLICIES = [
  {
    key: 'termsOfSaleContent',
    label: 'Términos de venta',
    hint: 'Las condiciones que aceptan tus clientes al comprar en tu tienda.',
  },
  {
    key: 'shippingPolicyContent',
    label: 'Política de envío',
    hint: 'Tiempos de entrega, zonas de cobertura y costos de envío.',
  },
  {
    key: 'returnPolicyContent',
    label: 'Devoluciones y reembolsos',
    hint: 'Cómo pueden tus clientes devolver un artículo o pedir un reembolso.',
  },
  {
    key: 'privacyPolicyContent',
    label: 'Política de privacidad',
    hint: 'Cómo manejás, como comerciante, los datos personales de tus clientes.',
  },
] as const

export default function PoliciesSettingsScreen() {
  const form = useSettingsSection((tenant) => ({
    termsOfSaleContent: tenant.termsOfSaleContent ?? '',
    shippingPolicyContent: tenant.shippingPolicyContent ?? '',
    returnPolicyContent: tenant.returnPolicyContent ?? '',
    privacyPolicyContent: tenant.privacyPolicyContent ?? '',
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
      <SettingsSection
        title="Políticas de la tienda"
        hint="Se publican en tu tienda para tus clientes. Son independientes de los términos de la plataforma. Dejá un campo vacío para no publicar esa política."
      >
        {POLICIES.map(({ key, label, hint }) => (
          <View key={key} style={{ gap: 4 }}>
            <Input
              label={label}
              multiline
              numberOfLines={6}
              value={values[key]}
              editable={form.canEdit}
              onChangeText={(value) => form.patch({ [key]: value } as Partial<typeof values>)}
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            <Text color="muted" variant="caption">
              {hint}
            </Text>
          </View>
        ))}
      </SettingsSection>

      <SaveBar
        canEdit={form.canEdit}
        saving={form.isSaving}
        error={form.error}
        saved={form.saved}
        onPress={() =>
          form.save({
            termsOfSaleContent: values.termsOfSaleContent.trim() || null,
            shippingPolicyContent: values.shippingPolicyContent.trim() || null,
            returnPolicyContent: values.returnPolicyContent.trim() || null,
            privacyPolicyContent: values.privacyPolicyContent.trim() || null,
          })
        }
      />
    </Screen>
  )
}
