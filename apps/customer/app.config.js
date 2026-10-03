/**
 * Lets the api URL come from the environment instead of app.json, so the LAN
 * IP a phone needs to reach a local api never ends up in the repo. Set
 * EXPO_PUBLIC_API_URL in this app's `.env.local` (see `.env.example`), the
 * shell, or an EAS build profile's `env`; app.json's `extra.apiUrl` is the
 * fallback. Read at runtime through `Constants.expoConfig.extra.apiUrl`
 * (see src/lib/api.ts).
 *
 * EXPO_PUBLIC_STOREFRONT_ROOT_DOMAIN is the web storefront's root domain
 * (its `storefrontRootDomain`), so pasted `<slug>.<root>` share links are
 * parsed exactly like the web does; unset, a generic rule is used.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra?.apiUrl,
    // Left out when unset: the serialized config turns `null` into `{}`.
    ...(process.env.EXPO_PUBLIC_STOREFRONT_ROOT_DOMAIN
      ? { storefrontRootDomain: process.env.EXPO_PUBLIC_STOREFRONT_ROOT_DOMAIN }
      : null),
  },
})
