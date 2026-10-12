import type { TrustBadgeKey, TrustBadges } from '../types/api'

/** Render order of the storefront trust strip. */
export const TRUST_BADGE_KEYS: TrustBadgeKey[] = ['shipping', 'payment', 'delivery']

/** Matches the api's default `trust_badges` column — what every storefront showed before this was configurable. */
export const DEFAULT_TRUST_BADGES: TrustBadges = {
  shipping: { enabled: true, text: 'Envío gratis' },
  payment: { enabled: true, text: 'Pago seguro' },
  delivery: { enabled: true, text: 'Entrega rápida' },
}

/** The strip is a single row on a phone; longer text would be cut off. */
export const TRUST_BADGE_MAX_TEXT = 24
