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
   * or null if refresh failed. Kept caller-supplied (rather than a fixed path)
   * because staff and customer refresh through two unrelated endpoints.
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
        refreshPromise ??= config.refresh().finally(() => {
          refreshPromise = null
        })
        const newToken = await refreshPromise
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
