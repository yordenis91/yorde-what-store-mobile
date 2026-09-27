/** Neutral palette for chrome that isn't tenant-themed: the staff app's own UI, and shared surfaces/text/borders in both apps. */
export const neutral = {
  0: '#ffffff',
  50: '#f8fafc',
  100: '#f1f5f9',
  200: '#e2e8f0',
  300: '#cbd5e1',
  400: '#94a3b8',
  500: '#64748b',
  600: '#475569',
  700: '#334155',
  800: '#1e293b',
  900: '#0f172a',
  1000: '#000000',
} as const

export const semantic = {
  success: '#059669',
  successBg: '#ecfdf5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#2563eb',
  infoBg: '#eff6ff',
} as const

/** Staff app's own brand colour — independent of any tenant's storefront theme. */
export const staffBrand = {
  50: '#eef2ff',
  100: '#e0e7ff',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
} as const
