import React from 'react'
import { ScrollView, ScrollViewProps, View, ViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from './theme/ThemeProvider'

interface ScreenProps extends ViewProps {
  scroll?: boolean
  padded?: boolean
  /** Pull-to-refresh control — only applies with `scroll`. */
  refreshControl?: ScrollViewProps['refreshControl']
  /** Only applies with `scroll` — e.g. "handled" so a tap on a button doesn't just dismiss the keyboard. */
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps']
}

/** Standard screen container: safe-area + background + optional scroll, used by every route. */
export function Screen({
  scroll = false,
  padded = true,
  refreshControl,
  keyboardShouldPersistTaps,
  style,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme()
  const Container = scroll ? ScrollView : View
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Container
        style={[{ flex: scroll ? undefined : 1, padding: padded ? theme.spacing.lg : 0 }, style]}
        contentContainerStyle={scroll ? { padding: padded ? theme.spacing.lg : 0 } : undefined}
        {...(scroll ? { refreshControl, keyboardShouldPersistTaps } : null)}
        {...rest}
      >
        {children}
      </Container>
    </SafeAreaView>
  )
}
