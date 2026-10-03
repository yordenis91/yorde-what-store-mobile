import React, { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Input, Screen, Text } from '@yws/ui'
import { emailSchema, extractErrorMessage } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'

/**
 * Asks the api to email a reset link. The answer is the same whether or not
 * the email is registered (the api doesn't reveal which emails exist), so the
 * confirmation is worded the same way.
 */
export default function ForgotPasswordScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ingresá un email válido')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await customerApi.auth.forgotPassword(parsed.data)
      setSent(true)
    } catch (err) {
      setError(extractErrorMessage(err, 'No pudimos enviar el link. Intentá de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Text variant="title">¿Olvidaste tu contraseña?</Text>
        <Card style={{ gap: 16 }}>
          {sent ? (
            <Text>Si ese email está registrado, te llegará un link para restablecerla.</Text>
          ) : (
            <>
              <Text color="muted">
                Ingresá tu email y te enviamos un link para crear una contraseña nueva.
              </Text>
              <Input
                label="Correo electrónico"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              {error ? <Text color="danger">{error}</Text> : null}
              <Button title="Enviar link de restablecimiento" onPress={onSubmit} loading={loading} />
            </>
          )}
          <Button
            title="Volver a iniciar sesión"
            variant="ghost"
            onPress={() => router.replace(`/store/${slug}/auth/login`)}
          />
        </Card>
      </View>
    </Screen>
  )
}
