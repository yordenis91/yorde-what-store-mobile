/**
 * Lets the api URL come from the environment instead of app.json, so the LAN
 * IP a phone needs to reach a local api never ends up in the repo. Set
 * EXPO_PUBLIC_API_URL in this app's `.env.local` (see `.env.example`), the
 * shell, or an EAS build profile's `env`; app.json's `extra.apiUrl` is the
 * fallback. Read at runtime through `Constants.expoConfig.extra.apiUrl`
 * (see src/lib/api.ts).
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl,
    // The web storefront's base URL, for the order links the seller shares.
    // Left out when unset (the app then uses the api's origin): the
    // serialized config turns `null` into `{}`.
    ...(process.env.EXPO_PUBLIC_STOREFRONT_URL
      ? { storefrontUrl: process.env.EXPO_PUBLIC_STOREFRONT_URL }
      : null),
  },
})
