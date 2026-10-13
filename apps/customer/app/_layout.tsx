import 'react-native-gesture-handler'
import React from 'react'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { ThemeProvider } from '@yws/ui'
import Constants from 'expo-constants'
import { queryClient, queryPersister } from '../src/lib/query-client'
import { PERSIST_MAX_AGE_MS, shouldPersistQuery } from '../src/lib/query-state'
import { useBootstrapCustomerAuth } from '../src/hooks/useBootstrapCustomerAuth'

function Bootstrap() {
  useBootstrapCustomerAuth()
  return null
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: PERSIST_MAX_AGE_MS,
            // A new app version may change what the api returns or the cache shape.
            buster: Constants.expoConfig?.version ?? '0',
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => shouldPersistQuery(query.queryKey, query.state.status),
            },
          }}
        >
          {/* No tenantThemeName here: the root (store picker/welcome screen) isn't
              tenant-branded yet — `store/[slug]/_layout.tsx` re-themes once a tenant loads. */}
          <ThemeProvider>
            <Bootstrap />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
