import * as SecureStore from 'expo-secure-store'
import type { StateStorage } from 'zustand/middleware'

/**
 * A zustand `persist` storage engine backed by SecureStore, for state that's
 * sensitive but small (SecureStore has a ~2KB per-key limit on Android) — e.g.
 * the customer app's remembered store slug. Never use this for the cart or
 * anything list-shaped; see `async-json-storage.ts` for that.
 */
export const secureJsonStorage: StateStorage = {
  getItem: async (name) => (await SecureStore.getItemAsync(name)) ?? null,
  setItem: async (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: async (name) => SecureStore.deleteItemAsync(name),
}
