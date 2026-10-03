import React, { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, EmptyState, Input, Screen, Text } from '@yws/ui'
import { extractErrorMessage } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'

/**
 * Sets a new password from the emailed reset link's token. Reached from that
 * link (see `../login.tsx`, which matches the web's `/store/<slug>/login?token=`).
 * The api revokes every session on success, so the customer signs in again.
 */
export default function ResetPasswordScreen() {
  const { slug, token } = useLocalSearchParams<{ slug: string; token?: string }>()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!token) {
    return (
      <Screen>
        <EmptyState
          title="Link inválido"
          description="Pedí un link nuevo para restablecer tu contraseña."
          actionLabel="Pedir un link nuevo"
          onAction={() => router.replace(`/store/${slug}/auth/forgot-password`)}
        />
      </Screen>
    )
  }

  async function onSubmit() {
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await customerApi.auth.resetPassword(token!, password)
      setDone(true)
    } catch (err) {
      setError(extractErrorMessage(err, 'El link no es válido o ya venció. Pedí uno nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Text variant="title">Restablecer contraseña</Text>
        <Card style={{ gap: 16 }}>
          {done ? (
            <>
              <Text>Tu contraseña fue restablecida. Ya podés iniciar sesión con ella.</Text>
              <Button title="Iniciar sesión" onPress={() => router.replace(`/store/${slug}/auth/login`)} />
            </>
          ) : (
            <>
              <Input label="Nueva contraseña" secureTextEntry value={password} onChangeText={setPassword} />
              {error ? <Text color="danger">{error}</Text> : null}
              <Button title="Restablecer contraseña" onPress={onSubmit} loading={loading} />
            </>
          )}
        </Card>
      </View>
    </Screen>
  )
}
