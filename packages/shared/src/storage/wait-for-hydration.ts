import { useEffect, useState } from 'react'

interface PersistCapable {
  persist: {
    hasHydrated: () => boolean
    onFinishHydration: (listener: () => void) => () => void
  }
}

/**
 * Resolves once a zustand `persist`-wrapped store has finished reading its
 * storage engine. SecureStore/AsyncStorage reads are async, so a store's very
 * first read on app start (bootstrap()) can otherwise race rehydration: the
 * effect that calls it runs before persist has restored `refreshToken` (or
 * `tenantSlug`), sees it as still null, and bootstrap silently no-ops for a
 * session that was actually there — a one-shot effect, so it never gets a
 * second chance once rehydration does finish a moment later.
 */
export function waitForHydration(store: PersistCapable): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve()
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe()
      resolve()
    })
  })
}

/**
 * Render-time counterpart of `waitForHydration`: false until the store has
 * read its storage engine. Gate anything that both reads and writes persisted
 * state on it — a write made before hydration finishes is silently
 * overwritten by the persisted value once it does.
 */
export function useHasHydrated(store: PersistCapable): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated())
  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return store.persist.onFinishHydration(() => setHydrated(true))
  }, [store])
  return hydrated
}
