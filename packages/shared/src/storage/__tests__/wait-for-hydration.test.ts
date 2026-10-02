import { waitForHydration } from '../wait-for-hydration'

function fakeStore(hydrated: boolean) {
  const listeners = new Set<() => void>()
  return {
    listeners,
    finish: () => listeners.forEach((listener) => listener()),
    persist: {
      hasHydrated: () => hydrated,
      onFinishHydration: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    },
  }
}

describe('waitForHydration', () => {
  it('resolves immediately for an already-hydrated store', async () => {
    const store = fakeStore(true)
    await expect(waitForHydration(store)).resolves.toBeUndefined()
    expect(store.listeners.size).toBe(0)
  })

  it('waits for hydration to finish, then unsubscribes', async () => {
    const store = fakeStore(false)
    let resolved = false
    const waiting = waitForHydration(store).then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(resolved).toBe(false)

    store.finish()
    await waiting
    expect(resolved).toBe(true)
    expect(store.listeners.size).toBe(0)
  })
})
