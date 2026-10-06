import React from 'react'
import { RefreshControl } from 'react-native'
import { Input, Screen } from '@yws/ui'
import { SOCIAL_NETWORKS } from '@yws/shared'
import { ReadOnlyNotice, SaveBar, SettingsPlaceholder, SettingsSection, useSettingsSection } from '../../src/components/settings'

export default function SocialSettingsScreen() {
  const form = useSettingsSection((tenant) => ({
    links: Object.fromEntries(
      SOCIAL_NETWORKS.map(({ key }) => [key, tenant.socialLinks?.[key] ?? '']),
    ) as Record<string, string>,
    /**
     * Keys the api has but this screen doesn't render. `socialLinks` is a
     * free-form JSON column and the save replaces it whole, so they're
     * carried through instead of being dropped.
     */
    unmanaged: Object.fromEntries(
      Object.entries(tenant.socialLinks ?? {}).filter(
        ([key]) => !SOCIAL_NETWORKS.some((network) => network.key === key),
      ),
    ) as Record<string, string>,
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
        title="Redes sociales"
        hint="Se muestran como iconos en la cabecera de tu tienda. Dejá vacías las que no uses."
      >
        {SOCIAL_NETWORKS.map(({ key, label, placeholder }) => (
          <Input
            key={key}
            label={label}
            placeholder={placeholder}
            value={values.links[key] ?? ''}
            editable={form.canEdit}
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={(value) => form.patch({ links: { ...values.links, [key]: value } })}
          />
        ))}
      </SettingsSection>

      <SaveBar
        canEdit={form.canEdit}
        saving={form.isSaving}
        error={form.error}
        saved={form.saved}
        onPress={() =>
          form.save({
            socialLinks: {
              ...values.unmanaged,
              // Only the filled ones: an empty string would render an icon
              // linking nowhere on the storefront.
              ...Object.fromEntries(
                Object.entries(values.links)
                  .map(([key, value]) => [key, value.trim()])
                  .filter(([, value]) => value),
              ),
            },
          })
        }
      />
    </Screen>
  )
}
