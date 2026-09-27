/** Central registry of persisted-storage keys, so the two apps never collide on a name. */
export const STORAGE_KEYS = {
  customerAuth: 'yws-customer-auth',
  cart: 'yws-cart',
} as const
