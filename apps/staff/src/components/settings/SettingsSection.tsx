import React from 'react'
import { View } from 'react-native'
import { Button, Card, EmptyState, Screen, Spinner, Text, useTheme } from '@yws/ui'

/** One titled group of fields inside a settings screen. */
export function SettingsSection({
  title,
  hint,
  children,
}: {
  title?: string
  hint?: string
  children: React.ReactNode
}) {
  const theme = useTheme()
  return (
    <Card style={{ gap: theme.spacing.md, marginBottom: theme.spacing.md }}>
      {title ? <Text weight="semibold">{title}</Text> : null}
      {hint ? (
        <Text color="muted" variant="caption">
          {hint}
        </Text>
      ) : null}
      {children}
    </Card>
  )
}

/**
 * The save button with its own feedback, at the bottom of a section. Renders
 * nothing for a collaborator — there is nothing they can save.
 */
export function SaveBar({
  onPress,
  saving,
  error,
  saved,
  canEdit,
  title = 'Guardar cambios',
}: {
  onPress: () => void
  saving: boolean
  error: string | null
  saved: boolean
  canEdit: boolean
  title?: string
}) {
  const theme = useTheme()
  if (!canEdit) return null
  return (
    <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.xl }}>
      {error ? <Text color="danger">{error}</Text> : null}
      {saved ? <Text color="success">Configuración guardada</Text> : null}
      <Button title={title} loading={saving} onPress={onPress} />
    </View>
  )
}

/**
 * What a section shows before it has anything to edit: the spinner while the
 * store loads, or the reason it didn't with a way to try again — never a
 * spinner that spins forever because the request failed.
 */
export function SettingsPlaceholder({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (isLoading || !error) return <Spinner fullScreen />
  return (
    <Screen>
      <EmptyState
        title="No pudimos cargar la configuración"
        description={error}
        actionLabel="Reintentar"
        onAction={onRetry}
      />
    </Screen>
  )
}
