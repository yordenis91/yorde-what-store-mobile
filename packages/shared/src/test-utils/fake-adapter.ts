import axios, { AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

/** What the fake api answers with: an HTTP status (+ body), or a request that never reaches it. */
export type FakeReply = { status: number; data?: unknown } | 'network-error'

export interface FakeRequest {
  method: string
  /** Path relative to the api origin, e.g. `/auth/mobile/refresh` — baseURL already resolved. */
  path: string
  headers: Record<string, string | undefined>
  /** Query parameters as axios received them (`config.params`), not yet serialized into the path. */
  params: unknown
  body: unknown
}

export type FakeHandler = (request: FakeRequest) => FakeReply | Promise<FakeReply>

/**
 * Routes every axios request through `handler` instead of the network, so the
 * api clients can be exercised end to end (interceptors, refresh, retries)
 * without a server. Install it BEFORE building a client: `axios.create()`
 * copies `axios.defaults.adapter` at creation time.
 */
export function installFakeAdapter(origin: string, handler: FakeHandler) {
  const previous = axios.defaults.adapter
  const requests: FakeRequest[] = []

  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const url = config.url?.startsWith('http') ? config.url : `${config.baseURL ?? ''}${config.url ?? ''}`
    const request: FakeRequest = {
      method: (config.method ?? 'get').toUpperCase(),
      path: url.replace(origin, ''),
      headers: {
        authorization: config.headers.get('Authorization')?.toString(),
        tenant: config.headers.get('X-Tenant-ID')?.toString(),
      },
      params: config.params,
      body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    }
    requests.push(request)

    const reply = await handler(request)
    if (reply === 'network-error') {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {})
    }
    const response: AxiosResponse = {
      data: reply.data ?? {},
      status: reply.status,
      statusText: String(reply.status),
      headers: {},
      config,
      request: {},
    }
    if (reply.status >= 400) {
      throw new AxiosError(`Request failed with status code ${reply.status}`, AxiosError.ERR_BAD_RESPONSE, config, {}, response)
    }
    return response
  }

  axios.defaults.adapter = adapter
  return {
    requests,
    restore: () => {
      axios.defaults.adapter = previous
    },
  }
}

/** The api's `{ success, data }` envelope, as `unwrap()` expects it. */
export function ok(data: unknown, status = 200): FakeReply {
  return { status, data: { success: true, data } }
}
