import React from 'react'
import { ScrollView, View, ViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from './theme/ThemeProvider'

interface ScreenProps extends ViewProps {
  scroll?: boolean
  padded?: boolean
}

/** Standard screen container: safe-area + background + optional scroll, used by every route. */
export function Screen({ scroll = false, padded = true, style, children, ...rest }: ScreenProps) {
  const theme = useTheme()
  const Container = scroll ? ScrollView : View
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Container
        style={[{ flex: scroll ? undefined : 1, padding: padded ? theme.spacing.lg : 0 }, style]}
        contentContainerStyle={scroll ? { padding: padded ? theme.spacing.lg : 0 } : undefined}
        {...rest}
      >
        {children}
      </Container>
    </SafeAreaView>
  )
}
