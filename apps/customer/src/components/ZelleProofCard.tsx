import React, { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Text } from '@yws/ui'
import { extractErrorMessage, httpStatusOf } from '@yws/shared'
import { customerApi } from '../lib/api'

/**
 * Lets the customer attach their Zelle payment screenshot to an order that
 * already exists. Deliberately separate from placing the order (same as the
 * web checkout): they may not have the confirmation on hand yet, so this can
 * never block the order — it's offered on the confirmation screen and again
 * from the order's detail screen.
 *
 * The public order only says whether the order is paid, not whether a proof
 * was already sent, so "uploaded" is only known after an upload from here.
 */
export function ZelleProofCard({ slug, orderId }: { slug: string; orderId: string }) {
  const order = useQuery({
    queryKey: ['public-order', slug, orderId],
    queryFn: () => customerApi.orders.public(orderId),
  })
  const [reference, setReference] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pickAndUpload() {
    setError(null)
    // The system photo picker needs no permission prompt on Android 13+ / iOS 14+.
    // A quality below 1 makes iOS export a JPEG instead of HEIC, which the api rejects.
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    const asset = picked.canceled ? undefined : picked.assets[0]
    if (!asset) return

    setUploading(true)
    try {
      await customerApi.orders.uploadPaymentProof(
        orderId,
        {
          uri: asset.uri,
          name: asset.fileName ?? 'comprobante.jpg',
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
        reference.trim() || undefined,
      )
      setUploaded(true)
    } catch (err) {
      // 409: the store confirmed the payment meanwhile — show that instead of an error.
      if (httpStatusOf(err) === 409) {
        await order.refetch()
        return
      }
      setError(extractErrorMessage(err, 'No pudimos subir la captura. Intentá de nuevo.'))
    } finally {
      setUploading(false)
    }
  }

  if (order.data?.paymentStatus === 'PAID') {
    return (
      <Card>
        <Text color="success" weight="semibold">
          Este pedido ya fue confirmado como pagado.
        </Text>
      </Card>
    )
  }

  return (
    <Card style={{ gap: 12 }}>
      <Text weight="semibold">Confirmación de pago</Text>
      <Text color="muted" variant="caption">
        Subí una captura de pantalla de tu confirmación de Zelle. Tu pedido se confirmará una vez que la
        tienda la revise — también podés hacerlo más tarde, desde el detalle del pedido.
      </Text>
      {uploaded ? (
        <Text color="success">Comprobante subido — la tienda va a confirmar tu pago en breve.</Text>
      ) : null}
      <Input
        label="Número de confirmación (opcional)"
        autoCapitalize="characters"
        value={reference}
        onChangeText={setReference}
      />
      {error ? <Text color="danger">{error}</Text> : null}
      <Button
        title={uploaded ? 'Subir otra captura' : 'Subir captura'}
        variant="secondary"
        loading={uploading}
        onPress={() => void pickAndUpload()}
      />
    </Card>
  )
}
