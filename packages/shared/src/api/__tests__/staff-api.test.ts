import { createStaffApi } from '../staff-api'
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
