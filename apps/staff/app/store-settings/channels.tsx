import React from 'react'
import { RefreshControl } from 'react-native'
import { Input, Screen, ToggleRow } from '@yws/ui'
import { PlanLockedNotice, ReadOnlyNotice, SaveBar, SettingsPlaceholder, SettingsSection, useSettingsSection } from '../../src/components/settings'

const PLACEHOLDERS =
  '{store_name} {order_no} {item_variable} {sub_total} {discount_amount} {shipping_amount} {item_tax} {item_total}'

export default function ChannelsSettingsScreen() {
  const form = useSettingsSection((tenant) => ({
    whatsappEnabled: tenant.whatsappEnabled,
    whatsappNumber: tenant.whatsappNumber ?? '',
    telegramEnabled: tenant.telegramEnabled,
    telegramBotToken: tenant.telegramBotToken ?? '',
    telegramChatId: tenant.telegramChatId ?? '',
    orderMessageTemplate: tenant.orderMessageTemplate ?? '',
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
      <SettingsSection title="Checkout por WhatsApp">
        <PlanLockedNotice method="WHATSAPP" />
        <ToggleRow
          label="Habilitar WhatsApp"
          hint="El pedido llega como mensaje al número de la tienda."
          value={values.whatsappEnabled}
          disabled={!form.canEdit}
          onChange={(whatsappEnabled) => form.patch({ whatsappEnabled })}
        />
        {values.whatsappEnabled ? (
          <Input
            label="Número de WhatsApp"
            placeholder="+15551234567"
            keyboardType="phone-pad"
            value={values.whatsappNumber}
            editable={form.canEdit}
            onChangeText={(whatsappNumber) => form.patch({ whatsappNumber })}
          />
        ) : null}
      </SettingsSection>

      <SettingsSection title="Checkout por Telegram">
        <PlanLockedNotice method="TELEGRAM" />
        <ToggleRow
          label="Habilitar Telegram"
          hint="El pedido llega al chat del bot que configures."
          value={values.telegramEnabled}
          disabled={!form.canEdit}
          onChange={(telegramEnabled) => form.patch({ telegramEnabled })}
        />
        {values.telegramEnabled ? (
          <>
            <Input
              label="Token del bot"
              autoCapitalize="none"
              value={values.telegramBotToken}
              editable={form.canEdit}
              onChangeText={(telegramBotToken) => form.patch({ telegramBotToken })}
            />
            <Input
              label="Chat ID"
              autoCapitalize="none"
              value={values.telegramChatId}
              editable={form.canEdit}
              onChangeText={(telegramChatId) => form.patch({ telegramChatId })}
            />
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Plantilla del mensaje de pedido" hint={`Variables disponibles: ${PLACEHOLDERS}`}>
        <Input
          multiline
          numberOfLines={8}
          autoCapitalize="none"
          value={values.orderMessageTemplate}
          editable={form.canEdit}
          onChangeText={(orderMessageTemplate) => form.patch({ orderMessageTemplate })}
          style={{ minHeight: 160, textAlignVertical: 'top' }}
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
              whatsappEnabled: values.whatsappEnabled,
              whatsappNumber: values.whatsappNumber.trim() || null,
              telegramEnabled: values.telegramEnabled,
              telegramBotToken: values.telegramBotToken.trim() || null,
              telegramChatId: values.telegramChatId.trim() || null,
              orderMessageTemplate: values.orderMessageTemplate,
            },
            (v) => {
              if (v.whatsappEnabled && !v.whatsappNumber.trim()) return 'Ingresá el número de WhatsApp'
              if (v.telegramEnabled && !v.telegramBotToken.trim()) return 'Ingresá el token del bot de Telegram'
              if (v.telegramEnabled && !v.telegramChatId.trim()) return 'Ingresá el chat ID de Telegram'
              return null
            },
          )
        }
      />
    </Screen>
  )
}
