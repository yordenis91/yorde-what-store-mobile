import React from 'react'
import { RefreshControl } from 'react-native'
import { Input, Screen, ToggleRow } from '@yws/ui'
import { DEFAULT_TRUST_BADGES, TRUST_BADGE_KEYS, TRUST_BADGE_MAX_TEXT, type TrustBadgeKey, type TrustBadges } from '@yws/shared'
import { ReadOnlyNotice, SaveBar, SettingsPlaceholder, SettingsSection, useSettingsSection } from '../../src/components/settings'

const LABELS: Record<TrustBadgeKey, string> = {
  shipping: 'Envío',
  payment: 'Pago',
  delivery: 'Entrega',
}

export default function TrustSettingsScreen() {
  // A tenant that never set the field falls back to the api's own defaults.
  const form = useSettingsSection((tenant) => ({ badges: { ...DEFAULT_TRUST_BADGES, ...tenant.trustBadges } as TrustBadges }))

  if (!form.values)
    return <SettingsPlaceholder isLoading={form.isLoading} error={form.error} onRetry={form.refetch} />
  const values = form.values

  function patchBadge(key: TrustBadgeKey, change: Partial<TrustBadges[string]>) {
    form.patch({ badges: { ...values.badges, [key]: { ...values.badges[key], ...change } } })
  }

  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={form.isRefetching} onRefresh={form.refetch} />}
    >
      {form.canEdit ? null : <ReadOnlyNotice role={form.tenant?.myRole} />}
      <SettingsSection
        title="Franja de confianza"
        hint="Aparece bajo la cabecera de tu tienda. Activá o desactivá cada mensaje y editá su texto."
      >
        {TRUST_BADGE_KEYS.map((key) => (
          <React.Fragment key={key}>
            <ToggleRow
              label={LABELS[key]}
              value={values.badges[key].enabled}
              disabled={!form.canEdit}
              onChange={(enabled) => patchBadge(key, { enabled })}
            />
            {values.badges[key].enabled ? (
              <Input
                label={`Texto de ${LABELS[key].toLowerCase()}`}
                placeholder={DEFAULT_TRUST_BADGES[key].text}
                maxLength={TRUST_BADGE_MAX_TEXT}
                value={values.badges[key].text}
                editable={form.canEdit}
                onChangeText={(text) => patchBadge(key, { text })}
              />
            ) : null}
          </React.Fragment>
        ))}
      </SettingsSection>

      <SaveBar
        canEdit={form.canEdit}
        saving={form.isSaving}
        error={form.error}
        saved={form.saved}
        // The api replaces the whole object, so all three badges are always sent (keys this screen doesn't manage ride along in values.badges).
        onPress={() => form.save({ trustBadges: values.badges })}
      />
    </Screen>
  )
}
