import React from 'react'
import { Alert, Image, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Button, Text, useTheme } from '@yws/ui'
import { extractErrorMessage, type UploadImageType } from '@yws/shared'
import { useUploadStoreImage } from '../../hooks/queries'
import { mediaUrl } from '../../lib/api'

/**
 * Picks an image, uploads it (`POST /uploads/image`) and hands the caller the
 * stored `/uploads/...` path to include in the next settings save — the same
 * two-step the web does. Nothing is persisted on the store until that save.
 */
export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  uploadType,
  shape = 'square',
  disabled,
}: {
  label: string
  hint: string
  value: string | null | undefined
  onChange: (url: string | null) => void
  uploadType: UploadImageType
  /** 'wide' for the storefront banner (4:1), 'square' for a logo. */
  shape?: 'square' | 'wide'
  disabled?: boolean
}) {
  const theme = useTheme()
  const upload = useUploadStoreImage()

  async function pick(source: 'camera' | 'library') {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 }
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('Sin acceso a la cámara', 'Podés habilitarlo en los ajustes del teléfono.')
        return
      }
    }
    // A quality below 1 makes iOS export a JPEG instead of HEIC, which the api rejects.
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options)
    const asset = result.canceled ? undefined : result.assets[0]
    if (!asset) return
    upload.mutate(
      {
        image: { uri: asset.uri, name: asset.fileName ?? `${uploadType}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' },
        type: uploadType,
      },
      { onSuccess: onChange },
    )
  }

  function onPickPress() {
    Alert.alert(label, undefined, [
      { text: 'Sacar foto', onPress: () => void pick('camera') },
      { text: 'Elegir de la galería', onPress: () => void pick('library') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  const size = shape === 'wide' ? { width: '100%' as const, aspectRatio: 4 } : { width: 80, height: 80 }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View>
        <Text weight="medium" variant="caption">
          {label}
        </Text>
        <Text color="muted" variant="caption">
          {hint}
        </Text>
      </View>
      <View
        style={{
          ...size,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
          overflow: 'hidden',
        }}
      >
        {value ? <Image source={{ uri: mediaUrl(value) }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
      </View>
      {upload.error ? <Text color="danger">{extractErrorMessage(upload.error, 'No pudimos subir la imagen.')}</Text> : null}
      {disabled ? null : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button
            title={value ? 'Cambiar' : 'Subir imagen'}
            variant="secondary"
            loading={upload.isPending}
            onPress={onPickPress}
            fullWidth={false}
          />
          {value ? <Button title="Quitar" variant="ghost" onPress={() => onChange(null)} fullWidth={false} /> : null}
        </View>
      )}
    </View>
  )
}
