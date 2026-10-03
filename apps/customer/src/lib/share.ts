import Constants from 'expo-constants'
import { Share } from 'react-native'
import { resolveStorefrontBaseUrl, storefrontLink, type Product, type PublicTenant } from '@yws/shared'
import { API_URL } from './api'

/** The web storefront's base URL (EXPO_PUBLIC_STOREFRONT_URL, else the api's origin). */
const STOREFRONT_URL = resolveStorefrontBaseUrl(Constants.expoConfig?.extra?.storefrontUrl, API_URL)

/** Web links in the storefront's `/store/<slug>` form — they open in the app (Android App Links) and work for anyone without it. */
export function storeLink(slug: string, subpath = ''): string {
  return storefrontLink(STOREFRONT_URL, slug, subpath)
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
