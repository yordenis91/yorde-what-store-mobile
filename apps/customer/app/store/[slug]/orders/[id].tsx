import React from 'react'
import { Redirect, useLocalSearchParams } from 'expo-router'

/** Older path for an order's detail — the full page lives at `order/[id]` (same path as the web's). */
export default function MyOrderDetailRedirect() {
  const { slug, id } = useLocalSearchParams<{ slug: string; id: string }>()
  return <Redirect href={`/store/${slug}/order/${id}`} />
}
