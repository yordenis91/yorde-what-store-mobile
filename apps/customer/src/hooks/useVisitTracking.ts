import { useEffect, useRef } from 'react'
import { usePathname } from 'expo-router'
import { customerApi } from '../lib/api'
import { APP_REFERRER, getAnalyticsSessionId } from '../lib/analytics'

/**
 * Logs one pageview per distinct store screen the shopper lands on, like the
 * web's useVisitTracking. The paths match the web storefront's
 * (`/store/<slug>/product/<id>`), so both show up together in the dashboard.
 * Only mount it once the store is pinned, so the visit carries its X-Tenant-ID.
 */
export function useVisitTracking() {
  const pathname = usePathname()
  const lastLogged = useRef<string | null>(null)

  useEffect(() => {
    if (lastLogged.current === pathname) return
    lastLogged.current = pathname
    void getAnalyticsSessionId()
      .then((sessionId) => customerApi.visits.log({ path: pathname, referrer: APP_REFERRER, sessionId }))
      .catch(() => undefined)
  }, [pathname])
}
