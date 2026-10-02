import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope } from '../types/api'

export interface HttpFactoryConfig {
  baseURL: string
  /** Read on every request — return null to send no Authorization header. */
  getAccessToken: () => string | null
  /** Read on every request — return null to send no X-Tenant-ID header. */
  getTenantId: () => string | null
  /** Called with the new access token after a successful silent refresh. */
  onTokenRefreshed: (accessToken: string) => void
  /** Called when refresh fails (or there is no session to refresh) — the caller should clear its store and route to login. */
  onAuthExpired: () => void
  /**
   * Hits this realm's own refresh endpoint and resolves the new access token,
   * or null if the session is definitively gone (see `isRefreshRejected`).
   * Rejects instead when the api couldn't be reached — the session may still
   * be valid, so the failed request is just surfaced as-is and nothing is
   * cleared. Kept caller-supplied (rather than a fixed path) because staff
   * and customer refresh through two unrelated endpoints.
   */
  refresh: () => Promise<string | null>
  /** Path prefix whose 401s must never trigger a refresh loop (the login/refresh calls themselves). */
  authPathPrefix: string
}

/**
 * Builds one axios instance with token + tenant injection and single-flight
 * refresh-on-401, mirroring `yorde-what-store-client/src/services/api-client.ts`.
 * Deliberately a factory, not a singleton: the staff and customer realms each
 * get their own instance, own token source and own refresh flow, so a bug in
 * one can never leak the other's session.
 */
export function createHttpClient(config: HttpFactoryConfig): AxiosInstance {
  const client = axios.create({ baseURL: config.baseURL })

  client.interceptors.request.use((request: InternalAxiosRequestConfig) => {
    const token = config.getAccessToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    const tenantId = config.getTenantId()
    if (tenantId) {
      request.headers.set('X-Tenant-ID', tenantId)
    }
    return request
  })

  let refreshPromise: Promise<string | null> | null = null

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
      const status = error.response?.status
      const isAuthCall = (original?.url ?? '').replace(/^\//, '').startsWith(config.authPathPrefix)

      if (status === 401 && original && !original._retry && !isAuthCall) {
        original._retry = true
        // Sent with a token that a concurrent request has since refreshed —
        // retry with the current one rather than rotating the refresh token again.
        const current = config.getAccessToken()
        if (current && original.headers.get('Authorization') !== `Bearer ${current}`) {
          return client(original)
        }
        refreshPromise ??= config.refresh().finally(() => {
          refreshPromise = null
        })
        let newToken: string | null
        try {
          newToken = await refreshPromise
        } catch {
          // Refresh endpoint unreachable — keep the session, fail this request.
          return Promise.reject(error)
        }
        if (newToken) {
          config.onTokenRefreshed(newToken)
          original.headers.set('Authorization', `Bearer ${newToken}`)
          return client(original)
        }
        config.onAuthExpired()
      }

      return Promise.reject(error)
    },
  )

  return client
}

/**
 * Whether a failed refresh call means the api rejected the refresh token
 * (revoked, expired, reused, wrong device…) rather than merely not being
 * reachable. Only a rejection may wipe the stored token: a network error,
 * timeout, 429 or 5xx says nothing about the session, and clearing it then
 * would log the user out just for opening the app offline.
 */
export function isRefreshRejected(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return false
  const { status } = error.response
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}

export function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  return promise.then((res) => res.data.data)
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (Array.isArray(data?.message)) return data.message.join(', ')
    if (typeof data?.message === 'string') return data.message
  }
  return fallback
}
