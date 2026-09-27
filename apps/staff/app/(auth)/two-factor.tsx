import React, { useState } from 'react'
import { View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Card, Input, Screen, Text } from '@yws/ui'
import { extractErrorMessage, useStaffAuthStore } from '@yws/shared'
import { staffApi } from '../../src/lib/api'

export default function TwoFactorScreen() {
  const { challengeToken } = useLocalSearchParams<{ challengeToken: string }>()
  const setSession = useStaffAuthStore((s) => s.setSession)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit() {
    setLoading(true)
    setError(null)
    try {
      const result = await staffApi.auth.verifyTwoFactor(challengeToken, code)
      setSession(result)
      router.replace('/select-tenant')
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid code'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 24 }}>
        <Text variant="title">Two-factor code</Text>
        <Card style={{ gap: 16 }}>
          <Input label="6-digit code" keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} />
          {error ? <Text color="danger">{error}</Text> : null}
          <Button title="Verify" onPress={onSubmit} loading={loading} />
        </Card>
      </View>
    </Screen>
  )
}
