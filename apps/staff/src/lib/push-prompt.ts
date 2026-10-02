import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'yws-staff-push-prompted'

/** Whether the in-app pre-prompt has already been shown once on this device — never re-asked automatically after that, accept or decline. */
export async function hasBeenPromptedForPush(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === 'true'
}

export async function markPromptedForPush(): Promise<void> {
  await AsyncStorage.setItem(KEY, 'true')
}
