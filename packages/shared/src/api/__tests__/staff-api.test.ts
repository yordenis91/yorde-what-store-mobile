import { createStaffApi, mergeTenant, paymentCredentialsError, type UpsertPaymentSetting } from '../staff-api'
import { extractErrorMessage } from '../http-factory'
import { useStaffAuthStore } from '../../stores/staff-auth.store'
import { installFakeAdapter, ok, type FakeHandler, type FakeReply } from '../../test-utils/fake-adapter'
import { TEST_DEVICE_ID, flushPersist, secureStoreData } from '../../test-utils/native-mocks'
import type { Tenant, User } from '../../types/api'

jest.mock('expo-secure-store', () => require('../../test-utils/native-mocks').secureStoreMock)
jest.mock('expo-crypto', () => require('../../test-utils/native-mocks').cryptoMock)

const ORIGIN = 'https://api.test'
const BASE = `${ORIGIN}/api/v1`

const user = { id: 'u1', name: 'Ana', email: 'ana@example.com' } as User
const tenant = (id: string) => ({ id, name: `Store ${id}` }) as Tenant

/**
 * A fake api for the staff realm. Protected routes accept only the token the
 * last refresh/switch handed out; `refreshReply` decides how the mobile
 * refresh endpoint behaves.
 */
function fakeApi(options: { tenants?: Tenant[]; refreshReply?: FakeReply } = {}) {
  let issued = 'none'
  const handler: FakeHandler = (req) => {
    switch (`${req.method} ${req.path}`) {
      case 'POST /api/v1/auth/mobile/refresh':
        if (options.refreshReply) return options.refreshReply
        issued = 'at-refreshed'
        return ok({ accessToken: issued, refreshToken: 'rt-rotated' })
      case 'POST /api/v1/auth/switch-tenant':
        issued = `at-${(req.body as { tenantId: string }).tenantId}`
        return ok({ user, accessToken: issued, mobileRefreshToken: 'rt-switched' })
    }
    if (req.headers.authorization !== `Bearer ${issued}`) return { status: 401 }
    switch (`${req.method} ${req.path}`) {
      case 'GET /api/v1/auth/me':
        return ok(user)
      case 'GET /api/v1/tenants/me':
        return ok(options.tenants ?? [])
      case 'GET /api/v1/orders':
        return ok({ items: [], meta: {} })
    }
    return { status: 404 }
  }
  const fake = installFakeAdapter(ORIGIN, handler)
  restore = fake.restore
  return { api: createStaffApi(BASE), requests: fake.requests }
}

let restore: (() => void) | undefined

/** A signed-in seller on store t1; every call answers `reply`. */
function signedIn(reply: (req: { method: string; path: string }) => FakeReply = () => ok({})) {
  useStaffAuthStore.setState({ accessToken: 'at-1', refreshToken: 'rt-1', activeTenant: tenant('t1') })
  const fake = installFakeAdapter(ORIGIN, reply)
  restore = fake.restore
  return { api: createStaffApi(BASE), requests: fake.requests }
}

beforeEach(() => {
  secureStoreData.clear()
  useStaffAuthStore.setState(useStaffAuthStore.getInitialState(), true)
})
afterEach(() => restore?.())

describe('staffApi.auth.bootstrap', () => {
  it('returns null without calling the api when there is no stored session', async () => {
    const { api, requests } = fakeApi()
    await expect(api.auth.bootstrap()).resolves.toBeNull()
    expect(requests).toHaveLength(0)
  })

  it('sends the stored refresh token with this install’s device id', async () => {
    useStaffAuthStore.setState({ refreshToken: 'rt-1' })
    const { api, requests } = fakeApi({ tenants: [] })
    await api.auth.bootstrap()
    expect(requests[0]).toMatchObject({
      path: '/api/v1/auth/mobile/refresh',
      body: { refreshToken: 'rt-1', deviceId: TEST_DEVICE_ID },
    })
  })

  it('clears the stored token and returns null when the api rejects it', async () => {
    useStaffAuthStore.setState({ refreshToken: 'rt-revoked' })
    const { api } = fakeApi({ refreshReply: { status: 401 } })
    await expect(api.auth.bootstrap()).resolves.toBeNull()
    expect(useStaffAuthStore.getState().refreshToken).toBeNull()
  })

  it.each<[string, FakeReply]>([
    ['network error', 'network-error'],
    ['503', { status: 503 }],
    ['429', { status: 429 }],
  ])('rejects but keeps the stored token on a %s', async (_label, refreshReply) => {
    useStaffAuthStore.setState({ refreshToken: 'rt-1' })
    const { api } = fakeApi({ refreshReply })
    await expect(api.auth.bootstrap()).rejects.toBeDefined()
    expect(useStaffAuthStore.getState().refreshToken).toBe('rt-1')
  })

  it('re-enters the remembered store through switch-tenant', async () => {
    useStaffAuthStore.setState({ refreshToken: 'rt-1', lastTenantId: 't2' })
    const { api, requests } = fakeApi({ tenants: [tenant('t1'), tenant('t2')] })

    const result = await api.auth.bootstrap()

    expect(result).toEqual({ user, tenants: [tenant('t1'), tenant('t2')], activeTenant: tenant('t2') })
    expect(requests.at(-1)).toMatchObject({
      path: '/api/v1/auth/switch-tenant',
      body: { tenantId: 't2', deviceId: TEST_DEVICE_ID },
    })
    // The switched token (scoped to t2) wins, and its rotated refresh token is kept.
    expect(useStaffAuthStore.getState()).toMatchObject({ accessToken: 'at-t2', refreshToken: 'rt-switched' })
  })

  it('opens the only store without needing a remembered one', async () => {
    useStaffAuthStore.setState({ refreshToken: 'rt-1' })
    const { api } = fakeApi({ tenants: [tenant('t1')] })
    await expect(api.auth.bootstrap()).resolves.toMatchObject({ activeTenant: tenant('t1') })
    expect(useStaffAuthStore.getState().accessToken).toBe('at-t1')
  })

  it.each([
    ['nothing is remembered', null],
    ['the remembered store is no longer one of theirs', 't-gone'],
  ])('leaves the store unpicked when %s and there are several', async (_label, lastTenantId) => {
    useStaffAuthStore.setState({ refreshToken: 'rt-1', lastTenantId })
    const { api, requests } = fakeApi({ tenants: [tenant('t1'), tenant('t2')] })
    await expect(api.auth.bootstrap()).resolves.toMatchObject({ activeTenant: null })
    expect(requests.some((r) => r.path.endsWith('/switch-tenant'))).toBe(false)
  })
})

describe('staffApi session handling on 401', () => {
  it('silently refreshes and retries a protected call', async () => {
    useStaffAuthStore.setState({ accessToken: 'at-expired', refreshToken: 'rt-1', user })
    const { api } = fakeApi()
    await expect(api.orders.list()).resolves.toEqual({ items: [], meta: {} })
    expect(useStaffAuthStore.getState()).toMatchObject({ accessToken: 'at-refreshed', refreshToken: 'rt-rotated' })
  })

  it('signs the user out when the refresh is rejected', async () => {
    useStaffAuthStore.setState({ accessToken: 'at-expired', refreshToken: 'rt-1', user })
    const { api } = fakeApi({ refreshReply: { status: 401 } })
    await expect(api.orders.list()).rejects.toBeDefined()
    expect(useStaffAuthStore.getState()).toMatchObject({ accessToken: null, refreshToken: null, user: null })
  })

  it('keeps the user signed in when the api is unreachable', async () => {
    useStaffAuthStore.setState({ accessToken: 'at-expired', refreshToken: 'rt-1', user })
    const { api } = fakeApi({ refreshReply: 'network-error' })
    await expect(api.orders.list()).rejects.toBeDefined()
    expect(useStaffAuthStore.getState()).toMatchObject({ accessToken: 'at-expired', refreshToken: 'rt-1', user })
  })
})

describe('useStaffAuthStore persistence', () => {
  it('persists only the refresh token and last store — never the access token or profile', async () => {
    const store = useStaffAuthStore.getState()
    store.setSession({ user, accessToken: 'at-secret' })
    store.setRefreshToken('rt-1')
    store.setActiveTenant(tenant('t1'))
    await flushPersist()

    const persisted = JSON.parse(secureStoreData.get('yws-staff-auth')!)
    expect(persisted.state).toEqual({ refreshToken: 'rt-1', lastTenantId: 't1' })
  })

  it('remembers the last store across sign-out', () => {
    const store = useStaffAuthStore.getState()
    store.setActiveTenant(tenant('t1'))
    store.setActiveTenant(null)
    store.clear()
    expect(useStaffAuthStore.getState()).toMatchObject({ activeTenant: null, lastTenantId: 't1' })
  })
})

describe('staffApi orders, Zelle and products', () => {
  it('passes the order filters to the list', async () => {
    const { api, requests } = signedIn(() => ok({ items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } }))
    await api.orders.list({ status: 'PENDING', search: 'Ana', page: 2, limit: 20 })
    expect(requests[0]).toMatchObject({
      path: '/api/v1/orders',
      params: { status: 'PENDING', search: 'Ana', page: 2, limit: 20 },
      headers: { authorization: 'Bearer at-1', tenant: 't1' },
    })
  })

  it.each([
    ['confirmZellePayment', '/api/v1/orders/o1/confirm-zelle-payment'],
    ['rejectZellePayment', '/api/v1/orders/o1/reject-zelle-payment'],
  ] as const)('%s posts to its endpoint', async (method, path) => {
    const { api, requests } = signedIn(() => ok({ id: 'o1' }))
    await api.orders[method]('o1')
    expect(requests[0]).toMatchObject({ method: 'POST', path })
  })

  it('patches only the fields the app edits on a product', async () => {
    const { api, requests } = signedIn(() => ok({ id: 'p1' }))
    await api.products.update('p1', { price: 12.5, quantity: 3, isPublished: false })
    expect(requests[0]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/products/p1',
      body: { price: 12.5, quantity: 3, isPublished: false },
    })
  })

  it('uploads a photo, then attaches the returned url to the product', async () => {
    const { api, requests } = signedIn((req) =>
      req.path === '/api/v1/uploads/image' ? ok({ url: '/uploads/t1/a.webp' }) : ok({ id: 'img1' }),
    )
    await api.products.addImage('p1', { uri: 'file:///a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' }, { isCover: true })
    expect(requests.map((r) => `${r.method} ${r.path}`)).toEqual([
      'POST /api/v1/uploads/image',
      'POST /api/v1/products/p1/images',
    ])
    expect(requests[1]!.body).toEqual({ url: '/uploads/t1/a.webp', isCover: true })
  })
})

describe('staffApi store settings', () => {
  it('patches only the section’s own fields, and sends null to clear one', async () => {
    const { api, requests } = signedIn(() => ok({ id: 't1' }))
    await api.tenants.update({ name: 'Tienda Ana', tagline: null, tracksInventory: true })
    expect(requests[0]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/tenants/current',
      headers: { authorization: 'Bearer at-1', tenant: 't1' },
      body: { name: 'Tienda Ana', tagline: null, tracksInventory: true },
    })
    // The api runs with forbidNonWhitelisted: anything beyond the section's
    // own fields (id, slug, smtpPasswordSet…) would turn the save into a 400.
    expect(Object.keys(requests[0]!.body as object)).toEqual(['name', 'tagline', 'tracksInventory'])
  })

  it('surfaces the api’s own message when a collaborator’s save is refused', async () => {
    const { api } = signedIn(() => ({ status: 403, data: { message: 'Insufficient role for this resource' } }))
    const error = await api.tenants.update({ name: 'x' }).catch((err: unknown) => err)
    expect(extractErrorMessage(error, 'fallback')).toBe('Insufficient role for this resource')
  })

  it('puts one provider’s credentials and on/off state', async () => {
    const { api, requests } = signedIn(() => ok({ id: 'ps1', provider: 'ZELLE', isEnabled: true }))
    await api.tenants.upsertPaymentSetting({
      provider: 'ZELLE',
      isEnabled: true,
      credentials: { recipientName: 'Ana', recipientEmail: 'ana@pay.test', recipientPhone: '', instructions: '' },
    })
    expect(requests[0]).toMatchObject({
      method: 'PUT',
      path: '/api/v1/tenants/current/payment-settings',
      body: { provider: 'ZELLE', isEnabled: true, credentials: { recipientName: 'Ana' } },
    })
  })

  it('uploads a store image with its resize type and resolves the stored path', async () => {
    const { api, requests } = signedIn(() => ok({ url: '/uploads/t1/logo.webp' }))
    await expect(
      api.tenants.uploadImage({ uri: 'file:///logo.png', name: 'logo.png', mimeType: 'image/png' }, 'logo'),
    ).resolves.toBe('/uploads/t1/logo.webp')
    expect(requests[0]).toMatchObject({ method: 'POST', path: '/api/v1/uploads/image' })
  })

  it('reads the Zelle recipient from the public storefront projection', async () => {
    const { api, requests } = signedIn(() => ok({ slug: 'ana', zellePaymentInfo: { recipientName: 'Ana' } }))
    await expect(api.tenants.storefront('ana')).resolves.toMatchObject({
      zellePaymentInfo: { recipientName: 'Ana' },
    })
    expect(requests[0]!.path).toBe('/api/v1/tenants/storefront/ana')
  })
})

describe('paymentCredentialsError', () => {
  const zelle = (credentials: Partial<Record<string, string>>): UpsertPaymentSetting => ({
    provider: 'ZELLE',
    isEnabled: true,
    credentials: { recipientName: '', recipientEmail: '', recipientPhone: '', instructions: '', ...credentials },
  })

  // The api replaces the stored credentials blob with whatever it receives and
  // never returns it, so a half-empty save is how a store loses live keys.
  it('refuses an incomplete Stripe key pair', () => {
    expect(
      paymentCredentialsError({
        provider: 'STRIPE',
        isEnabled: true,
        credentials: { publishableKey: 'pk_1', secretKey: '  ' },
      }),
    ).toMatch(/clave secreta/)
  })

  it('refuses an empty MercadoPago token', () => {
    expect(
      paymentCredentialsError({ provider: 'MERCADOPAGO', isEnabled: false, credentials: { accessToken: '' } }),
    ).toMatch(/access token/)
  })

  it('requires a Zelle recipient but not the optional phone or instructions', () => {
    expect(paymentCredentialsError(zelle({ recipientEmail: 'ana@pay.test' }))).toMatch(/nombre/)
    expect(paymentCredentialsError(zelle({ recipientName: 'Ana' }))).toMatch(/correo/)
    expect(paymentCredentialsError(zelle({ recipientName: 'Ana', recipientEmail: 'ana@pay.test' }))).toBeNull()
  })
})

describe('mergeTenant', () => {
  // Only GET /tenants/me adds myRole; findCurrent (the GET and the PATCH
  // response) doesn't, so replacing the stored tenant would demote the owner
  // to a read-only collaborator until the next app start.
  it('keeps the role the settings response omits', () => {
    const stored = { ...tenant('t1'), myRole: 'OWNER' as const }
    expect(mergeTenant(stored, { ...tenant('t1'), name: 'Nuevo nombre' })).toMatchObject({
      name: 'Nuevo nombre',
      myRole: 'OWNER',
    })
  })

  it('prefers a role the response does carry', () => {
    const stored = { ...tenant('t1'), myRole: 'OWNER' as const }
    expect(mergeTenant(stored, { ...tenant('t1'), myRole: 'STAFF' }).myRole).toBe('STAFF')
  })
})
