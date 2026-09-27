import 'react-native-gesture-handler'
import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { ThemeProvider } from '@yws/ui'
import { queryClient } from '../src/lib/query-client'
import { useBootstrapStaffAuth } from '../src/hooks/useBootstrapStaffAuth'

function Bootstrap() {
  useBootstrapStaffAuth()
  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Bootstrap />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
