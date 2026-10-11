import Constants from 'expo-constants'
import { createCustomerApi, createMediaUrlResolver } from '@yws/shared'

export const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000/api/v1'
/**
 * The web storefront's origin, for a shareable `/store/:slug` link (the
 * ywstore:// scheme only resolves for people who already have the app).
 * Derived from API_URL rather than its own config: per the api repo's
 * DEPLOY.md, web and api are always deployed same-origin (web at `/`, api at
 * `/api/v1`) — same-origin cookies are what make the web client's own login
 * work at all — so API_URL's origin always is the web storefront's origin.
 */
export const WEB_URL = API_URL.replace(/\/api\/v1\/?$/, '')

/** One instance for the whole app — see the warning in `createCustomerApi`'s doc comment. */
export const customerApi = createCustomerApi(API_URL)

/** Turns the api's relative `/uploads/...` image paths into URLs `<Image>` can load. */
export const mediaUrl = createMediaUrlResolver(API_URL)
