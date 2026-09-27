import { useCallback, useRef } from 'react'
import { Alert, Platform } from 'react-native'
import { getDeviceId, registerForPushNotificationsAsync } from '@yws/shared'
import { staffApi } from '../lib/api'
import { hasBeenPromptedForPush, markPromptedForPush } from '../lib/push-prompt'

async function registerDevice(): Promise<void> {
  const token = await registerForPushNotificationsAsync()
  if (!token) return // denied, or a simulator/web — nothing to register
  const deviceId = await getDeviceId()
  await staffApi.devices.register({
    token,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    deviceId,
  })
}

/**
 * Shows the notifications pre-prompt the first time the seller has at least
 * one order — asking before the app has anything worth notifying them about
 * would just be permission-priming noise. Never re-asked automatically after
 * that, whether they accept or decline (see push-prompt.ts); there's no
 * settings toggle to re-trigger it yet.
 *
 * The pre-prompt is a plain Alert, deliberately: it exists only to explain
 * *why* before the OS dialog appears (which can only meaningfully ask once
 * per install on iOS), not to be a polished UI moment.
 */
export function usePushRegistration() {
  const checked = useRef(false)

  const promptIfNeeded = useCallback((totalOrders: number) => {
    if (checked.current || totalOrders <= 0) return
    checked.current = true

    hasBeenPromptedForPush().then((alreadyPrompted) => {
      if (alreadyPrompted) return
      Alert.alert(
        'Stay on top of new orders',
        'Get notified the moment a new order comes in — even when the app is closed.',
        [
          { text: 'Not now', style: 'cancel', onPress: () => markPromptedForPush() },
          {
            text: 'Enable notifications',
            onPress: () => {
              registerDevice()
                .catch(() => undefined)
                .finally(() => markPromptedForPush())
            },
          },
        ],
      )
    })
  }, [])

  return { promptIfNeeded }
}
