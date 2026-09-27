import Constants from 'expo-constants'
import { createStaffApi } from '@yws/shared'

export const API_URL = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:3000/api/v1'

/** One instance for the whole app — see the warning in `createStaffApi`'s doc comment. */
export const staffApi = createStaffApi(API_URL)
