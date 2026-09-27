# Yorde What Store — Mobile

Two native apps for the Yorde What Store multitenant ecommerce platform, sharing
one monorepo with the design system and the API contract:

- **`apps/staff`** — the seller/staff app (dashboard, products, orders, customers).
- **`apps/customer`** — the storefront app end customers shop from.

Both talk to the same backend, [`yorde-what-store-api`](https://github.com/yordenis91/yorde-what-store-api),
and mirror the contracts already proven out in [`yorde-what-store-client`](https://github.com/yordenis91/yorde-what-store-client)
(the web admin + storefront). This README describes what's actually built, not
an aspirational plan — see "Open backend questions" below for the two gaps
that need a decision before this is production-ready.

## Why two apps, not one

A staff member and a customer are different trust boundaries with different
sessions (see `packages/shared/src/api/staff-api.ts` vs `customer-api.ts`).
Splitting them into two binaries — rather than one app with a mode switch —
makes that boundary structural instead of a runtime `if`: there is no code
path where a customer's screen can reach a staff bearer token, because the
two apps don't share a JS bundle at all, only the pure library code below.

## Layout

```
yorde-what-store-mobile/
├── apps/
│   ├── staff/          Expo Router app — seller/staff
│   └── customer/        Expo Router app — storefront/customer
├── packages/
│   ├── shared/          Types, the two API client factories, zustand stores, utils
│   ├── ui/               Presentational components only — no business logic
│   └── tokens/           Design tokens (colors, spacing, typography)
├── pnpm-workspace.yaml
└── turbo.json
```

Hard rules, enforced by convention (not yet by a lint rule — see "Follow-ups"):

- `packages/shared` never imports from `apps/*`.
- `apps/customer` never imports from `apps/staff`, or vice versa — not even a
  relative path reaching across.
- `packages/ui` holds no business logic or API calls, only presentation.
- The API client is two isolated factories, `createStaffApi()` and
  `createCustomerApi()` (`packages/shared/src/api/`), each with its own axios
  instance, its own interceptor, and its own zustand auth store. Nothing is
  shared between them at runtime — see the doc comments on both files.

## Multitenant model

Confirmed with the project owner: the mobile apps resolve tenant the same way
the web admin does when it isn't on a real subdomain — the **`X-Tenant-ID`**
header — since native apps have no subdomain concept:

- **Staff app**: `X-Tenant-ID` is the active tenant's UUID, read from
  `useStaffAuthStore().activeTenant.id` after login + `/auth/switch-tenant`
  (mirrors the web admin's tenant switcher).
- **Customer app**: `X-Tenant-ID` is the store's **slug**, remembered in
  `useCustomerAuthStore().tenantSlug` — set from the "enter your store"
  screen (`app/index.tsx`) or a `ywstore://store/<slug>` deep link, since
  there's no subdomain to infer it from on native.

The JWT also carries `tenantId`/`tenantRole` server-side for authorization,
but per `yorde-what-store-api`'s `TenantMiddleware`, the header (or subdomain,
web-only) is what resolves the *active* tenant for the request — so the
header must be sent on every authenticated call, not assumed from the token.

## Getting started

```bash
pnpm install

pnpm dev:staff       # or: pnpm --filter @yws/staff dev
pnpm dev:customer    # or: pnpm --filter @yws/customer dev
```

Each app's API base URL is `expo.extra.apiUrl` in its `app.json` (defaults to
`http://localhost:3000/api/v1`) — override per environment with an EAS
build profile or `app.config.ts`, the same way the web client's
`docker-entrypoint.sh` injects `VITE_API_URL` at runtime.

Both apps were verified with `pnpm typecheck` and `pnpm lint` (turbo, across
all packages) — clean on both. Neither has been run in a simulator/device in
this session (no Xcode/Android SDK in this container); do that before
treating any screen as done.

## Open backend questions

Two real gaps found while building this, flagged rather than silently worked
around:

### 1. Refresh-token cookie doesn't survive a killed app

`POST /auth/login` (and its storefront/customer equivalent) sets the refresh
token as an **httpOnly cookie** and only ever returns the access token in the
body (`yorde-what-store-api/src/modules/auth/auth.controller.ts`). That's
correct and necessary for the web client. On React Native there is no
persistent, app-restart-surviving cookie jar without adding a native
cookie-jar library — `useStaffAuthStore`/`useCustomerAuthStore` keep the
access token in memory only (same posture as the web client), and
`auth.bootstrap()` best-effort attempts the refresh call on cold start, but
it will fail after the app has been fully killed and relaunched, forcing a
re-login.

**Needs a decision**: either (a) add a mobile-safe refresh path to the api —
e.g. return the refresh token in the response body when a request carries a
header like `X-Client: mobile`, so the apps can store it themselves in
`expo-secure-store` — or (b) accept shorter mobile sessions and rely on
re-login. Flagged in code at `packages/shared/src/stores/staff-auth.store.ts`
and `customer-auth.store.ts`. **Not decided or silently worked around.**

### 2. No push-notification endpoint in the api

`yorde-what-store-api` has no push/FCM/device-token module today (grepped
the whole `src/` tree — none). `packages/shared/src/notifications/push.ts`
implements the client-side half (permission request, Expo push token) but
is **not wired up** — no screen calls it. Turning it on needs:

1. A tenant-scoped endpoint to register/unregister a device token per staff
   user or customer.
2. `queue/processors/order-notification.processor.ts` (which already renders
   the WhatsApp/Telegram fulfillment message) to also fan out a push.

## What's deliberately not done yet

- **Product variant selection** — `product/[id].tsx` in the customer app
  disables "add to cart" for products with variants rather than guessing a
  UI for it; the web client's variant picker should be ported, not
  reinvented.
- **Stripe/MercadoPago checkout** — checkout only implements the `WHATSAPP`
  fulfillment path (every tenant has it; it's the product's primary channel).
  Card checkout needs the same in-app browser / deep-link-return flow the
  web client uses (`createStripeCheckout` / `createMercadoPagoCheckout`),
  adapted for a WebView or `expo-web-browser`.
- **App icons/splash screens** — `app.json` has no `icon`/`splash` keys yet
  (no brand assets available in this session); Expo will use its own
  placeholder until real assets are added.
- **E2E/unit tests** — `jest`/`jest-expo` are wired into both apps'
  `package.json` (`pnpm test`) but no test files exist yet.

## Design tokens & theming

`packages/tokens/src/storefront-themes.ts` is kept byte-for-byte in sync with
`yorde-what-store-client/src/config/themes.ts` — a tenant's `theme` column
renders the same brand colour on the web storefront and in the customer app.
The staff app uses its own fixed brand (`packages/tokens/src/palette.ts`,
`staffBrand`), independent of any tenant, matching that the staff app is the
platform's own tool rather than a per-tenant storefront.
