import Constants from 'expo-constants'
import { Share } from 'react-native'
import type { Product, PublicTenant } from '@yws/shared'
import { API_URL } from './api'

const configured: unknown = Constants.expoConfig?.extra?.storefrontUrl
/** The web storefront's base URL — in production the web and the api share a domain, so the api's origin is the fallback. */
const STOREFRONT_URL = (
  typeof configured === 'string' && configured
    ? configured
    : (API_URL.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i)?.[0] ?? '')
).replace(/\/+$/, '')

/** Web links in the storefront's `/store/<slug>` form — the one that opens in the app (Android App Links) and works for anyone without it. */
export function storeLink(slug: string, subpath = ''): string {
  return `${STOREFRONT_URL}/store/${slug}${subpath}`
}

function share(message: string, url: string) {
  // iOS shares `url` as a link and `message` as text; Android only takes `message`.
  return Share.share({ message: `${message}\n${url}`, url }).catch(() => undefined)
}

export function shareStore(tenant: PublicTenant) {
  return share(tenant.tagline ? `${tenant.name} — ${tenant.tagline}` : tenant.name, storeLink(tenant.slug))
}

export function shareProduct(tenant: PublicTenant, product: Product) {
  return share(`${product.name} en ${tenant.name}`, storeLink(tenant.slug, `/product/${product.id}`))
}
