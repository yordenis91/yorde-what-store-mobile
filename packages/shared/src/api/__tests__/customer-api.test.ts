import { createCustomerApi } from '../customer-api'
import { useCustomerAuthStore } from '../../stores/customer-auth.store'
import { installFakeAdapter, ok, type FakeReply } from '../../test-utils/fake-adapter'
import { flushPersist, secureStoreData } from '../../test-utils/native-mocks'
import type { Customer } from '../../types/api'

jest.mock('expo-secure-store', () => require('../../test-utils/native-mocks').secureStoreMock)
jest.mock('expo-crypto', () => require('../../test-utils/native-mocks').cryptoMock)

const ORIGIN = 'https://api.test'
const customer = { id: 'c1', name: 'Luis' } as Customer

function fakeApi(refreshReply?: FakeReply) {
  const fake = installFakeAdapter(ORIGIN, (req) => {
    if (req.path === '/storefront/customers/auth/mobile/refresh') {
      return refreshReply ?? ok({ accessToken: 'at-1', refreshToken: 'rt-rotated' })
    }
    if (req.path === '/storefront/customers/me' && req.headers.authorization === 'Bearer at-1') return ok(customer)
    return { status: 401 }
  })
  restore = fake.restore
  return { api: createCustomerApi(ORIGIN), requests: fake.requests }
}

let restore: (() => void) | undefined

beforeEach(() => {
  secureStoreData.clear()
  useCustomerAuthStore.setState(useCustomerAuthStore.getInitialState(), true)
})
afterEach(() => restore?.())

describe('customerApi.auth.bootstrap', () => {
  it('needs a remembered store before it can restore anything', async () => {
    useCustomerAuthStore.setState({ refreshToken: 'rt-1' })
    const { api, requests } = fakeApi()
    await expect(api.auth.bootstrap()).resolves.toBeNull()
    expect(requests).toHaveLength(0)
  })

  it('restores the customer, scoping every call to the store slug', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store', refreshToken: 'rt-1' })
    const { api, requests } = fakeApi()
    await expect(api.auth.bootstrap()).resolves.toEqual(customer)
    expect(requests.map((r) => r.headers.tenant)).toEqual(['my-store', 'my-store'])
    expect(useCustomerAuthStore.getState().refreshToken).toBe('rt-rotated')
  })

  it('clears the stored token when the api rejects it', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store', refreshToken: 'rt-1' })
    const { api } = fakeApi({ status: 401 })
    await expect(api.auth.bootstrap()).resolves.toBeNull()
    expect(useCustomerAuthStore.getState().refreshToken).toBeNull()
  })

  it('keeps the stored token when the api is unreachable', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store', refreshToken: 'rt-1' })
    const { api } = fakeApi('network-error')
    await expect(api.auth.bootstrap()).rejects.toBeDefined()
    expect(useCustomerAuthStore.getState().refreshToken).toBe('rt-1')
  })
})

describe('useCustomerAuthStore', () => {
  it('drops the session when switching to a different store', () => {
    useCustomerAuthStore.setState({ tenantSlug: 'store-a', customer, accessToken: 'at', refreshToken: 'rt' })
    useCustomerAuthStore.getState().setTenantSlug('store-b')
    expect(useCustomerAuthStore.getState()).toMatchObject({
      tenantSlug: 'store-b',
      customer: null,
      accessToken: null,
      refreshToken: null,
    })
  })

  it('keeps the session when the same store is set again', () => {
    useCustomerAuthStore.setState({ tenantSlug: 'store-a', customer, accessToken: 'at', refreshToken: 'rt' })
    useCustomerAuthStore.getState().setTenantSlug('store-a')
    expect(useCustomerAuthStore.getState()).toMatchObject({ customer, accessToken: 'at', refreshToken: 'rt' })
  })

  it('persists only the store slug and refresh token', async () => {
    const store = useCustomerAuthStore.getState()
    store.setTenantSlug('store-a')
    store.setSession({ customer, accessToken: 'at-secret' })
    store.setRefreshToken('rt-1')
    await flushPersist()
    expect(JSON.parse(secureStoreData.get('yws-customer-auth')!).state).toEqual({ tenantSlug: 'store-a', refreshToken: 'rt-1' })
  })
})
