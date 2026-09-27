import React, { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { Button, Card, Input, Screen, Text } from '@yws/ui'
import { extractErrorMessage, loginSchema, useStaffAuthStore } from '@yws/shared'
import { staffApi } from '../../src/lib/api'

export default function LoginScreen() {
  const setSession = useStaffAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid credentials')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await staffApi.auth.login(parsed.data)
      if ('requiresTwoFactor' in result) {
        router.push({ pathname: '/(auth)/two-factor', params: { challengeToken: result.challengeToken } })
        return
      }
      setSession(result)
      router.replace('/select-tenant')
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not sign in. Check your credentials.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen scroll>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <View style={{ gap: 4 }}>
          <Text variant="title">Yorde What Store</Text>
          <Text color="muted">Sign in to manage your store</Text>
        </View>
        <Card style={{ gap: 16 }}>
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error ? <Text color="danger">{error}</Text> : null}
          <Button title="Sign in" onPress={onSubmit} loading={loading} />
        </Card>
      </View>
    </Screen>
  )
}
