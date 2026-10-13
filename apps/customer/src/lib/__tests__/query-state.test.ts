import { isLoadFailure, shouldPersistQuery } from '../query-state'

describe('shouldPersistQuery', () => {
  it('keeps the public catalog', () => {
    expect(shouldPersistQuery(['tenant', 'demo'], 'success')).toBe(true)
    expect(shouldPersistQuery(['storefront-categories', 'demo'], 'success')).toBe(true)
    expect(shouldPersistQuery(['storefront-products', 'demo', 'list', undefined, undefined, 'newest'], 'success')).toBe(true)
    expect(shouldPersistQuery(['storefront-products', 'demo', 'abc-123'], 'success')).toBe(true)
    expect(shouldPersistQuery(['storefront-shipping', 'demo'], 'success')).toBe(true)
  })

  it('skips a typed search, so the cache does not grow with every keystroke', () => {
    expect(shouldPersistQuery(['storefront-products', 'demo', 'list', 'camis', undefined, 'newest'], 'success')).toBe(false)
  })

  it('never keeps what belongs to the signed-in customer or is priced live', () => {
    expect(shouldPersistQuery(['my-orders', 'demo'], 'success')).toBe(false)
    expect(shouldPersistQuery(['checkout-quote', 'demo', [], null, null], 'success')).toBe(false)
  })

  it('only keeps queries that loaded', () => {
    expect(shouldPersistQuery(['tenant', 'demo'], 'error')).toBe(false)
    expect(shouldPersistQuery(['tenant', 'demo'], 'pending')).toBe(false)
  })
})

describe('isLoadFailure', () => {
  it('is true on an error', () => {
    expect(isLoadFailure({ isError: true, isPending: false, fetchStatus: 'idle' })).toBe(true)
  })

  it('is true when a first load is paused for lack of connection', () => {
    expect(isLoadFailure({ isError: false, isPending: true, fetchStatus: 'paused' })).toBe(true)
  })

  it('is false while loading, and when saved data is on screen', () => {
    expect(isLoadFailure({ isError: false, isPending: true, fetchStatus: 'fetching' })).toBe(false)
    expect(isLoadFailure({ isError: false, isPending: false, fetchStatus: 'paused' })).toBe(false)
  })
})
