import React, { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Input, Screen, Text } from '@yws/ui'
import { extractErrorMessage, loginSchema, useCustomerAuthStore } from '@yws/shared'
import { customerApi } from '../../../../src/lib/api'

export default function CustomerLoginScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const setSession = useCustomerAuthStore((s) => s.setSession)
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
      const result = await customerApi.auth.login(parsed.data)
      setSession(result)
      router.back()
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not sign in.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Text variant="title">Sign in</Text>
        <Card style={{ gap: 16 }}>
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Input label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {error ? <Text color="danger">{error}</Text> : null}
          <Button title="Sign in" onPress={onSubmit} loading={loading} />
          <Button title="Create an account" variant="ghost" onPress={() => router.replace(`/store/${slug}/auth/register`)} />
        </Card>
      </View>
    </Screen>
  )
}
