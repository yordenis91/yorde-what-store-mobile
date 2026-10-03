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

  it.each([
    ['refresh', '/storefront/customers/auth/mobile/refresh'],
    ['profile', '/storefront/customers/me'],
  ])('drops store A’s session if the customer moves to store B during the %s call', async (_label, slowPath) => {
    useCustomerAuthStore.setState({ tenantSlug: 'store-a', refreshToken: 'rt-a' })
    const fake = installFakeAdapter(ORIGIN, (req) => {
      // The customer deep-links into another store while this request is in flight.
      if (req.path === slowPath) useCustomerAuthStore.getState().setTenantSlug('store-b')
      if (req.path.endsWith('/mobile/refresh')) return ok({ accessToken: 'at-1', refreshToken: 'rt-a2' })
      return ok(customer)
    })
    restore = fake.restore

    await expect(createCustomerApi(ORIGIN).auth.bootstrap()).resolves.toBeNull()
    expect(useCustomerAuthStore.getState()).toMatchObject({ tenantSlug: 'store-b', refreshToken: null, customer: null })
  })
})

describe('customerApi.orders.quote', () => {
  it('prices the cart with the coupon, scoped to the store', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const quote = { grandTotal: 18, couponError: null }
    const fake = installFakeAdapter(ORIGIN, () => ok(quote))
    restore = fake.restore

    const items = [{ productId: 'p1', quantity: 2 }]
    await expect(createCustomerApi(ORIGIN).orders.quote({ items, couponCode: 'SAVE10' })).resolves.toEqual(quote)
    expect(fake.requests[0]).toMatchObject({
      method: 'POST',
      path: '/storefront/orders/quote',
      headers: { tenant: 'my-store' },
      body: { items, couponCode: 'SAVE10' },
    })
  })
})

describe('customerApi.orders Zelle proof', () => {
  it('reads the public order without a session, scoped to the store', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const fake = installFakeAdapter(ORIGIN, () => ok({ id: 'o1', paymentStatus: 'PENDING' }))
    restore = fake.restore

    await expect(createCustomerApi(ORIGIN).orders.public('o1')).resolves.toEqual({ id: 'o1', paymentStatus: 'PENDING' })
    expect(fake.requests[0]).toMatchObject({
      method: 'GET',
      path: '/storefront/orders/o1/public',
      headers: { authorization: undefined, tenant: 'my-store' },
    })
  })

  it('uploads the screenshot as multipart, with the optional confirmation number', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const fake = installFakeAdapter(ORIGIN, () => ok({ id: 'o1', paymentProofUrl: '/uploads/x.webp' }))
    restore = fake.restore

    const image = { uri: 'file:///tmp/proof.jpg', name: 'proof.jpg', mimeType: 'image/jpeg' }
    await createCustomerApi(ORIGIN).orders.uploadPaymentProof('o1', image, 'ZL-123')

    const req = fake.requests[0]!
    expect(req).toMatchObject({ method: 'POST', path: '/storefront/orders/o1/payment-proof-image', headers: { tenant: 'my-store' } })
    // React Native's FormData keeps each part as appended; `getParts` is RN-only.
    const parts = (req.body as unknown as { getParts: () => { fieldName: string; uri?: string; type?: string; string?: string }[] }).getParts()
    expect(parts).toEqual([
      expect.objectContaining({ fieldName: 'file', uri: image.uri, type: 'image/jpeg', name: 'proof.jpg' }),
      expect.objectContaining({ fieldName: 'reference', string: 'ZL-123' }),
    ])
  })

  it('omits the confirmation number when there is none', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const fake = installFakeAdapter(ORIGIN, () => ok({ id: 'o1' }))
    restore = fake.restore

    await createCustomerApi(ORIGIN).orders.uploadPaymentProof('o1', { uri: 'file:///p.png', name: 'p.png', mimeType: 'image/png' })
    const parts = (fake.requests[0]!.body as unknown as { getParts: () => { fieldName: string }[] }).getParts()
    expect(parts.map((p) => p.fieldName)).toEqual(['file'])
  })
})

describe('customerApi.shipping.list', () => {
  it("lists the store's delivery options without a session", async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const options = [{ id: 's1', name: 'Envío a domicilio', cost: '1000', locationId: null, isActive: true }]
    const fake = installFakeAdapter(ORIGIN, () => ok(options))
    restore = fake.restore

    await expect(createCustomerApi(ORIGIN).shipping.list()).resolves.toEqual(options)
    expect(fake.requests[0]).toMatchObject({ method: 'GET', path: '/storefront/shipping', headers: { tenant: 'my-store' } })
  })
})

describe('customerApi catalog and analytics', () => {
  it('passes the category filter, sort and page to the products list', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const fake = installFakeAdapter(ORIGIN, () => ok({ items: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } }))
    restore = fake.restore

    await createCustomerApi(ORIGIN).products.list({ categoryId: 'c1', sort: 'price_asc', page: 2, limit: 20 })
    expect(fake.requests[0]).toMatchObject({
      path: '/storefront/products',
      params: { categoryId: 'c1', sort: 'price_asc', page: 2, limit: 20 },
      headers: { tenant: 'my-store' },
    })
  })

  it('lists the store categories', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const fake = installFakeAdapter(ORIGIN, () => ok([{ id: 'c1', name: 'Aventura' }]))
    restore = fake.restore

    await expect(createCustomerApi(ORIGIN).categories.list()).resolves.toEqual([{ id: 'c1', name: 'Aventura' }])
    expect(fake.requests[0]).toMatchObject({ method: 'GET', path: '/storefront/categories' })
  })

  it('logs a pageview with its path, referrer and session id', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store' })
    const fake = installFakeAdapter(ORIGIN, () => ok({ id: 'v1' }, 201))
    restore = fake.restore

    const visit = { path: '/store/my-store/product/p1', referrer: 'android-app://com.yordewhatstore.customer', sessionId: 's1' }
    await expect(createCustomerApi(ORIGIN).visits.log(visit)).resolves.toBeUndefined()
    expect(fake.requests[0]).toMatchObject({ method: 'POST', path: '/storefront/visits', body: visit, headers: { tenant: 'my-store' } })
  })
})

describe('customerApi.me.delete', () => {
  it('deletes the account and only then clears the local session', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store', customer, accessToken: 'at-1', refreshToken: 'rt-1' })
    const fake = installFakeAdapter(ORIGIN, () => ok({ anonymized: true }))
    restore = fake.restore

    await expect(createCustomerApi(ORIGIN).me.delete()).resolves.toEqual({ anonymized: true })
    expect(fake.requests[0]).toMatchObject({
      method: 'DELETE',
      path: '/storefront/customers/me',
      headers: { authorization: 'Bearer at-1', tenant: 'my-store' },
    })
    expect(useCustomerAuthStore.getState()).toMatchObject({ customer: null, accessToken: null, refreshToken: null })
    // Still on the same store: deleting the account isn't leaving it.
    expect(useCustomerAuthStore.getState().tenantSlug).toBe('my-store')
  })

  it('keeps the session when the api could not delete it', async () => {
    useCustomerAuthStore.setState({ tenantSlug: 'my-store', customer, accessToken: 'at-1', refreshToken: 'rt-1' })
    const fake = installFakeAdapter(ORIGIN, () => ({ status: 500 }))
    restore = fake.restore

    await expect(createCustomerApi(ORIGIN).me.delete()).rejects.toBeDefined()
    expect(useCustomerAuthStore.getState()).toMatchObject({ customer, accessToken: 'at-1', refreshToken: 'rt-1' })
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
