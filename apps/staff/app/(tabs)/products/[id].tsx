import React, { useEffect, useState } from 'react'
import { Alert, Image, Pressable, RefreshControl, ScrollView, Switch, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams } from 'expo-router'
import { Badge, Button, Card, EmptyState, Input, Screen, Spinner, Text, useTheme } from '@yws/ui'
import { extractErrorMessage, formatMoney, useStaffAuthStore, type Product, type ProductQuickEdit } from '@yws/shared'
import {
  useAddProductImage,
  useProduct,
  useRemoveProductImage,
  useSetCoverImage,
  useUpdateProduct,
} from '../../../src/hooks/queries'
import { mediaUrl } from '../../../src/lib/api'

/** "12,50" or "12.50" → 12.5; null for anything that isn't a non-negative number. */
function parseAmount(value: string): number | null {
  const n = Number(value.replace(',', '.').trim())
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text weight="semibold">{label}</Text>
        <Text color="muted" variant="caption">
          {hint}
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} />
    </View>
  )
}

/** Price, stock and visibility — what a seller adjusts from the phone. Full editing (variants, categories, taxes) stays on the web. */
function QuickEdit({ product }: { product: Product }) {
  const update = useUpdateProduct(product.id)
  const [price, setPrice] = useState(product.price)
  const [compareAt, setCompareAt] = useState(product.compareAtPrice ?? '')
  const [quantity, setQuantity] = useState(String(product.quantity))
  const [isActive, setIsActive] = useState(product.isActive)
  const [isPublished, setIsPublished] = useState(product.isPublished)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // A refetch (pull to refresh, another device's edit) resets the form.
  useEffect(() => {
    setPrice(product.price)
    setCompareAt(product.compareAtPrice ?? '')
    setQuantity(String(product.quantity))
    setIsActive(product.isActive)
    setIsPublished(product.isPublished)
  }, [product])

  function onSave() {
    setError(null)
    setSaved(false)
    const priceValue = parseAmount(price)
    if (priceValue === null) return setError('Ingresá un precio válido')
    const compareValue = compareAt.trim() === '' ? null : parseAmount(compareAt)
    if (compareAt.trim() !== '' && compareValue === null) return setError('Ingresá un precio anterior válido')
    const changes: ProductQuickEdit = { price: priceValue, compareAtPrice: compareValue, isActive, isPublished }
    // A product with variants keeps its stock per variant — edited on the web.
    if (!product.hasVariants) {
      const qty = Number(quantity)
      if (!Number.isInteger(qty) || qty < 0) return setError('Ingresá un stock válido (número entero)')
      changes.quantity = qty
    }
    update.mutate(changes, {
      onSuccess: () => setSaved(true),
      onError: (err) => setError(extractErrorMessage(err, 'No pudimos guardar los cambios.')),
    })
  }

  return (
    <Card style={{ gap: 12, marginBottom: 12 }}>
      <Text weight="semibold">Precio y stock</Text>
      <Input label="Precio" keyboardType="decimal-pad" value={price} onChangeText={setPrice} />
      <Input
        label="Precio anterior (opcional)"
        keyboardType="decimal-pad"
        value={compareAt}
        onChangeText={setCompareAt}
      />
      {product.hasVariants ? (
        <Text color="muted" variant="caption">
          Este producto tiene {product.variants.length} variantes: su stock se edita desde el panel web.
        </Text>
      ) : (
        <Input label="Stock" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
      )}
      <ToggleRow label="Activo" hint="Los productos inactivos no se pueden vender." value={isActive} onChange={setIsActive} />
      <ToggleRow label="Publicado" hint="Visible en la tienda." value={isPublished} onChange={setIsPublished} />
      {error ? <Text color="danger">{error}</Text> : null}
      {saved ? <Text color="success">Cambios guardados</Text> : null}
      <Button title="Guardar cambios" loading={update.isPending} onPress={onSave} />
    </Card>
  )
}

function Photos({ product }: { product: Product }) {
  const theme = useTheme()
  const add = useAddProductImage(product.id)
  const remove = useRemoveProductImage(product.id)
  const setCover = useSetCoverImage(product.id)
  const error = add.error ?? remove.error ?? setCover.error

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
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options)
    const asset = result.canceled ? undefined : result.assets[0]
    if (!asset) return
    add.mutate({
      image: { uri: asset.uri, name: asset.fileName ?? 'producto.jpg', mimeType: asset.mimeType ?? 'image/jpeg' },
      // The first photo becomes the cover, as on the web.
      isCover: product.images.length === 0,
    })
  }

  function onAdd() {
    Alert.alert('Agregar foto', undefined, [
      { text: 'Sacar foto', onPress: () => void pick('camera') },
      { text: 'Elegir de la galería', onPress: () => void pick('library') },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  function onImagePress(imageId: string, isCover: boolean) {
    Alert.alert('Foto', undefined, [
      ...(isCover ? [] : [{ text: 'Usar como portada', onPress: () => setCover.mutate(imageId) }]),
      {
        text: 'Eliminar',
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert('¿Eliminar la foto?', undefined, [
            { text: 'Volver', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(imageId) },
          ]),
      },
      { text: 'Cancelar', style: 'cancel' as const },
    ])
  }

  const images = [...product.images].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.sortOrder - b.sortOrder)
  return (
    <Card style={{ gap: 10, marginBottom: 12 }}>
      <Text weight="semibold">Fotos</Text>
      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {images.map((img) => (
            <Pressable key={img.id} onPress={() => onImagePress(img.id, img.isCover)} accessibilityRole="imagebutton">
              <Image
                source={{ uri: mediaUrl(img.url) }}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: theme.radius.md,
                  borderWidth: img.isCover ? 2 : 0,
                  borderColor: theme.colors.brand600,
                  backgroundColor: theme.colors.border,
                }}
              />
              {img.isCover ? (
                <Text variant="caption" style={{ textAlign: 'center' }}>
                  Portada
                </Text>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text color="muted">Este producto todavía no tiene fotos.</Text>
      )}
      {error ? <Text color="danger">{extractErrorMessage(error, 'No pudimos actualizar las fotos.')}</Text> : null}
      <Button title="Agregar foto" variant="secondary" loading={add.isPending} onPress={onAdd} />
    </Card>
  )
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const tenant = useStaffAuthStore((s) => s.activeTenant)
  const product = useProduct(id)

  if (product.isLoading) return <Spinner fullScreen />
  if (!product.data) {
    return (
      <Screen>
        <EmptyState title="Producto no encontrado" />
      </Screen>
    )
  }

  const p = product.data
  return (
    <Screen
      scroll
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={product.isRefetching} onRefresh={() => product.refetch()} />}
    >
      <Text variant="title">{p.name}</Text>
      <Text color="muted" style={{ marginBottom: 8 }}>
        {p.sku ?? 'Sin SKU'} · {formatMoney(p.price, tenant)}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <Badge label={p.isPublished ? 'Publicado' : 'Borrador'} tone={p.isPublished ? 'success' : 'neutral'} />
        <Badge label={p.isActive ? 'Activo' : 'Inactivo'} tone={p.isActive ? 'info' : 'danger'} />
      </View>
      <Photos product={p} />
      <QuickEdit product={p} />
      {p.description ? (
        <Card style={{ gap: 4 }}>
          <Text weight="semibold">Descripción</Text>
          <Text color="muted">{p.description}</Text>
        </Card>
      ) : null}
    </Screen>
  )
}
