import Constants from 'expo-constants'
import { createCustomerApi } from '@yws/shared'

export const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000/api/v1'
/** The public web storefront's origin — used to build a shareable `/store/:slug` link (the ywstore:// scheme only resolves for people who already have the app). */
export const WEB_URL = (Constants.expoConfig?.extra?.webUrl as string | undefined) ?? 'http://localhost:5173'

/** One instance for the whole app — see the warning in `createCustomerApi`'s doc comment. */
export const customerApi = createCustomerApi(API_URL)
