import Constants from 'expo-constants'
import { createCustomerApi } from '@yws/shared'

export const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000/api/v1'

/** One instance for the whole app — see the warning in `createCustomerApi`'s doc comment. */
export const customerApi = createCustomerApi(API_URL)
