import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Button, Card, Input, Screen, Text } from '@yws/ui'
import { emailSchema, extractErrorMessage } from '@yws/shared'
import { staffApi } from '../../src/lib/api'

/**
 * Asks the api to email a reset link. The link opens the web admin's reset
 * form (the staff app has no App Links); the answer is the same whether or not
 * the email is registered, so the confirmation is worded the same way.
 */
export default function ForgotPasswordScreen() {
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
      await staffApi.auth.forgotPassword(parsed.data)
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
            <Text>
              Si ese email está registrado, te llegará un link para restablecerla. Abrilo en el navegador y
              después volvé a iniciar sesión acá.
            </Text>
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
            onPress={() => router.replace('/(auth)/login')}
          />
        </Card>
      </View>
    </Screen>
  )
}
