import { AppState, Platform } from 'react-native'
import { focusManager } from '@tanstack/react-query'

// React Query refetches stale data on window focus, but React Native has no
// window — without this, coming back to the app (e.g. from a notification)
// keeps showing whatever was loaded before it went to the background.
focusManager.setEventListener((setFocused) => {
  if (Platform.OS === 'web') return undefined
  const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'))
  return () => subscription.remove()
})
