import React, { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Input, Screen, Text } from '@yws/ui'
import { customerRegisterSchema, extractErrorMessage, useCustomerAuthStore } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'

export default function CustomerRegisterScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const setSession = useCustomerAuthStore((s) => s.setSession)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    const parsed = customerRegisterSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos del formulario')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await customerApi.auth.register(parsed.data)
      setSession(result)
      router.back()
    } catch (err) {
      setError(extractErrorMessage(err, 'No pudimos crear tu cuenta.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Text variant="title">Crear cuenta</Text>
        <Card style={{ gap: 16 }}>
          <Input label="Nombre" value={name} onChangeText={setName} />
          <Input label="Correo electrónico" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />
          {error ? <Text color="danger">{error}</Text> : null}
          <Button title="Crear cuenta" onPress={onSubmit} loading={loading} />
          <Button title="Ya tengo una cuenta" variant="ghost" onPress={() => router.replace(`/store/${slug}/auth/login`)} />
        </Card>
      </View>
    </Screen>
  )
}
