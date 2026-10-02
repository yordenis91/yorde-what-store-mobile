import React, { useState } from 'react'
import { View } from 'react-native'
import { Redirect, router } from 'expo-router'
import { Button, Card, Input, Screen, Spinner, Text } from '@yws/ui'
import { extractErrorMessage, storeSlugSchema, useCustomerAuthStore, useHasHydrated } from '@yws/shared'
import { customerApi } from '../src/lib/api'

/**
 * Native has no subdomain, so this is where the web client's `/store/:slug`
 * fallback mode becomes the *only* mode: the customer enters (or deep-links
 * into) a store slug, which `useCustomerAuthStore` then remembers.
 */
export default function WelcomeScreen() {
  const hydrated = useHasHydrated(useCustomerAuthStore)
  const rememberedSlug = useCustomerAuthStore((s) => s.tenantSlug)
  const setTenantSlug = useCustomerAuthStore((s) => s.setTenantSlug)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Before hydration the remembered store isn't known yet — don't flash the picker.
  if (!hydrated) return <Spinner fullScreen />
  if (rememberedSlug) return <Redirect href={`/store/${rememberedSlug}`} />

  async function onContinue() {
    const parsed = storeSlugSchema.safeParse(input)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ingresá el nombre o el link de una tienda')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await customerApi.tenant.bySlug(parsed.data)
      setTenantSlug(parsed.data)
      router.replace(`/store/${parsed.data}`)
    } catch (err) {
      setError(extractErrorMessage(err, 'No encontramos esa tienda'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <View style={{ gap: 4 }}>
          <Text variant="title">Yorde What Store</Text>
          <Text color="muted">
            Ingresá el nombre de la tienda o el link que te compartieron para empezar a comprar
          </Text>
        </View>
        <Card style={{ gap: 16 }}>
          <Input placeholder="ej. mi-tienda" autoCapitalize="none" value={input} onChangeText={setInput} />
          {error ? <Text color="danger">{error}</Text> : null}
          <Button title="Continuar" onPress={onContinue} loading={loading} />
        </Card>
      </View>
    </Screen>
  )
}
