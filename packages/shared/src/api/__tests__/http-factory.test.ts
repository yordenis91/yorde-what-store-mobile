import { AxiosError } from 'axios'
import { createHttpClient, extractErrorMessage, isRefreshRejected, type HttpFactoryConfig } from '../http-factory'
import { installFakeAdapter, ok, type FakeHandler } from '../../test-utils/fake-adapter'

const ORIGIN = 'https://api.test'

/** A client whose protected routes accept only `Bearer fresh`, wired to an in-memory token. */
function setup(refresh: HttpFactoryConfig['refresh'], handler?: FakeHandler) {
  const session = { token: 'stale' as string | null, tenant: 'tenant-1' as string | null, expired: 0 }
  const fake = installFakeAdapter(
    ORIGIN,
    handler ?? ((req) => (req.headers.authorization === 'Bearer fresh' ? ok(req.path) : { status: 401 })),
  )
  const config: HttpFactoryConfig = {
    baseURL: ORIGIN,
    getAccessToken: () => session.token,
    getTenantId: () => session.tenant,
    onTokenRefreshed: (token) => {
      session.token = token
    },
    onAuthExpired: () => {
      session.expired++
      session.token = null
    },
    refresh: jest.fn(refresh),
    authPathPrefix: 'auth/',
  }
  return { client: createHttpClient(config), config, session, fake }
}

let restore: (() => void) | undefined
afterEach(() => restore?.())

describe('createHttpClient', () => {
  it('sends the access token and tenant header on every request', async () => {
    const { client, session, fake } = setup(async () => null, () => ok('fine'))
    restore = fake.restore
    session.token = 'abc'
    await client.get('/orders')
    expect(fake.requests[0]!.headers).toEqual({ authorization: 'Bearer abc', tenant: 'tenant-1' })
  })

  it('omits both headers when there is no session or tenant', async () => {
    const { client, session, fake } = setup(async () => null, () => ok('fine'))
    restore = fake.restore
    session.token = null
    session.tenant = null
    await client.get('/storefront/products')
    expect(fake.requests[0]!.headers).toEqual({ authorization: undefined, tenant: undefined })
  })

  it('refreshes on a 401 and retries the request with the new token', async () => {
    const { client, config, session, fake } = setup(async () => 'fresh')
    restore = fake.restore
    const res = await client.get('/orders')
    expect(res.data.data).toBe('/orders')
    expect(config.refresh).toHaveBeenCalledTimes(1)
    expect(session.token).toBe('fresh')
    expect(fake.requests.map((r) => r.headers.authorization)).toEqual(['Bearer stale', 'Bearer fresh'])
  })

  it('shares one refresh between concurrent 401s', async () => {
    const { client, config, fake } = setup(async () => 'fresh')
    restore = fake.restore
    const results = await Promise.all([client.get('/a'), client.get('/b'), client.get('/c')])
    expect(results.map((r) => r.data.data)).toEqual(['/a', '/b', '/c'])
    expect(config.refresh).toHaveBeenCalledTimes(1)
  })

  it('retries a 401 for an already-replaced token without refreshing again', async () => {
    // The 401 arrives after another request already refreshed: rotating the
    // refresh token a second time would be wasted (and racy) work.
    let releaseLate!: () => void
    const late = new Promise<void>((resolve) => (releaseLate = resolve))
    const { client, config, fake } = setup(
      async () => 'fresh',
      async (req) => {
        if (req.path === '/late' && req.headers.authorization === 'Bearer stale') await late
        return req.headers.authorization === 'Bearer fresh' ? ok(req.path) : { status: 401 }
      },
    )
    restore = fake.restore
    const lateRequest = client.get('/late')
    await client.get('/early') // refreshes to 'fresh'
    releaseLate()
    expect((await lateRequest).data.data).toBe('/late')
    expect(config.refresh).toHaveBeenCalledTimes(1)
  })

  it('expires the session when the refresh is rejected', async () => {
    const { client, session, fake } = setup(async () => null)
    restore = fake.restore
    await expect(client.get('/orders')).rejects.toMatchObject({ response: { status: 401 } })
    expect(session.expired).toBe(1)
  })

  it('keeps the session when the refresh endpoint is unreachable', async () => {
    const { client, session, fake } = setup(async () => {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK)
    })
    restore = fake.restore
    // Surfaces the original 401, not the refresh's network error.
    await expect(client.get('/orders')).rejects.toMatchObject({ response: { status: 401 } })
    expect(session.expired).toBe(0)
    expect(session.token).toBe('stale')
  })

  it('never refreshes for the auth endpoints themselves', async () => {
    const { client, config, fake } = setup(async () => 'fresh')
    restore = fake.restore
    await expect(client.post('/auth/login', {})).rejects.toMatchObject({ response: { status: 401 } })
    expect(config.refresh).not.toHaveBeenCalled()
  })

  it('retries at most once per request', async () => {
    // Even the refreshed token is refused: must not loop through refresh forever.
    const { client, config, fake } = setup(async () => 'fresh', () => ({ status: 401 }))
    restore = fake.restore
    await expect(client.get('/orders')).rejects.toMatchObject({ response: { status: 401 } })
    expect(config.refresh).toHaveBeenCalledTimes(1)
    expect(fake.requests).toHaveLength(2)
  })

  it('passes non-401 errors straight through', async () => {
    const { client, config, fake } = setup(async () => 'fresh', () => ({ status: 500 }))
    restore = fake.restore
    await expect(client.get('/orders')).rejects.toMatchObject({ response: { status: 500 } })
    expect(config.refresh).not.toHaveBeenCalled()
  })
})

describe('isRefreshRejected', () => {
  const withStatus = (status: number) =>
    new AxiosError('x', AxiosError.ERR_BAD_RESPONSE, undefined, {}, { status } as never)

  it.each([400, 401, 403, 404, 422])('treats %i as a definitive rejection', (status) => {
    expect(isRefreshRejected(withStatus(status))).toBe(true)
  })

  it.each([408, 429, 500, 502, 503])('treats %i as transient', (status) => {
    expect(isRefreshRejected(withStatus(status))).toBe(false)
  })

  it('treats network errors and non-axios errors as transient', () => {
    expect(isRefreshRejected(new AxiosError('Network Error', AxiosError.ERR_NETWORK))).toBe(false)
    expect(isRefreshRejected(new Error('boom'))).toBe(false)
  })
})

describe('extractErrorMessage', () => {
  const withBody = (data: unknown) =>
    new AxiosError('x', AxiosError.ERR_BAD_RESPONSE, undefined, {}, { status: 400, data } as never)

  it('reads the api message, joining validation arrays', () => {
    expect(extractErrorMessage(withBody({ message: 'Invalid credentials' }), 'fallback')).toBe('Invalid credentials')
    expect(extractErrorMessage(withBody({ message: ['email must be an email', 'password too short'] }), 'fallback')).toBe(
      'email must be an email, password too short',
    )
  })

  it('falls back when there is no usable message', () => {
    expect(extractErrorMessage(withBody({}), 'fallback')).toBe('fallback')
    expect(extractErrorMessage(new Error('boom'), 'fallback')).toBe('fallback')
  })
})
