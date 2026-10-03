import Constants from 'expo-constants'
import { createMediaUrlResolver, createStaffApi, resolveStorefrontBaseUrl } from '@yws/shared'

export const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000/api/v1'

/** One instance for the whole app — see the warning in `createStaffApi`'s doc comment. */
export const staffApi = createStaffApi(API_URL)

/** Turns the api's relative `/uploads/...` image paths into URLs `<Image>` can load. */
export const mediaUrl = createMediaUrlResolver(API_URL)

/** The web storefront's base URL (EXPO_PUBLIC_STOREFRONT_URL, else the api's origin) — see publicOrderLink. */
export const STOREFRONT_URL = resolveStorefrontBaseUrl(Constants.expoConfig?.extra?.storefrontUrl, API_URL)
