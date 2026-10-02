/**
 * In-memory stand-ins for the native modules the stores and api clients
 * touch. Wire them up from a test file with:
 *
 *   jest.mock('expo-secure-store', () => require('../../test-utils/native-mocks').secureStoreMock)
 *   jest.mock('expo-crypto', () => require('../../test-utils/native-mocks').cryptoMock)
 */
export const secureStoreData = new Map<string, string>()

export const secureStoreMock = {
  getItemAsync: async (key: string) => secureStoreData.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    secureStoreData.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    secureStoreData.delete(key)
  },
}

export const TEST_DEVICE_ID = 'device-1'

export const cryptoMock = {
  randomUUID: () => TEST_DEVICE_ID,
}

/** Lets zustand's `persist` finish its async write to the (mock) storage engine. */
export function flushPersist(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
