# Yorde What Store — Mobile

Two native apps for the Yorde What Store multitenant ecommerce platform, sharing
one monorepo with the design system and the API contract:

- **`apps/staff`** — the seller/staff app (dashboard, products, orders, customers).
- **`apps/customer`** — the storefront app end customers shop from.

Both talk to the same backend, [`yorde-what-store-api`](https://github.com/yordenis91/yorde-what-store-api),
and mirror the contracts already proven out in [`yorde-what-store-client`](https://github.com/yordenis91/yorde-what-store-client)
(the web admin + storefront). This README describes what's actually built, not
an aspirational plan — see "Open backend questions" below for the gap that
still needs mobile-side work before this is production-ready.

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

## Refresh tokens (resolved)

Mobile can't use the web client's httpOnly-cookie refresh (no persistent,
app-restart-surviving cookie jar on native without a cookie-jar library).
`yorde-what-store-api` now exposes a mobile-safe path instead —
`POST /auth/mobile/refresh` and `POST /storefront/customers/auth/mobile/refresh`
— purely additive alongside the web cookie flow, which is untouched:

- `login`/`register`/`2fa/verify`/`switch-tenant` (staff) and
  `login`/`register` (customer) send a `deviceId`
  (`packages/shared/src/utils/device-id.ts` — a UUID generated once and kept
  in SecureStore) and, in return, get a `mobileRefreshToken` in the response
  body alongside the usual access token.
- `useStaffAuthStore`/`useCustomerAuthStore` persist **only** `refreshToken`
  in SecureStore (`packages/shared/src/storage/secure-json-storage.ts`) —
  never the access token, same posture as the web client. `waitForHydration`
  (`packages/shared/src/storage/wait-for-hydration.ts`) guards each app's
  bootstrap effect against reading it before SecureStore's async rehydration
  finishes.
- Refreshing rotates the token (old one dies, a new one comes back) and
  reuse of an already-rotated token — or the right token from a different
  `deviceId` — revokes the whole token family server-side, forcing re-login
  everywhere that session was still alive. See the api's
  `AuthService.mobileRefresh` doc comment for the full design.
- `auth.logout()` in both `staff-api.ts` and `customer-api.ts` clears the
  locally-stored refresh token. The api has **no endpoint yet** to revoke a
  mobile refresh family server-side on logout (only the web cookie's own
  token gets revoked) — a real, if low-severity, follow-up: a device that's
  logged out locally but whose old refresh token leaked before that point
  could still be replayed until it naturally expires (7d staff / 30d
  customer) or is caught by reuse detection.

## Push notifications (staff app — resolved for staff, open for customer)

`yorde-what-store-api` has the backend half (`device_tokens` table,
`POST /devices` / `DELETE /devices/:token`, `PushService`/`NoOpPushService`,
hooked into `order-notification.processor.ts` for Telegram-fulfilled orders).
The staff app now wires up to it end to end:

- `apps/staff/src/hooks/usePushRegistration.ts` shows an in-app pre-prompt
  (a plain `Alert`, not a polished UI moment — its only job is to explain
  *why* before the OS dialog appears, which can only meaningfully ask once
  per install on iOS) the first time the dashboard loads with at least one
  order (`DashboardSummary.totalOrders > 0`) — asking before there's
  anything to notify about would just be permission-priming noise.
  Never re-asked automatically after that, accept or decline
  (`apps/staff/src/lib/push-prompt.ts`, AsyncStorage-backed) — there's no
  settings toggle to re-trigger it yet.
- Accepting calls `packages/shared/src/notifications/push.ts`'s
  `registerForPushNotificationsAsync()` (the OS permission dialog + Expo
  push token) and registers it via `staffApi.devices.register()`, keyed by
  the same stable `deviceId` the mobile-refresh flow uses.
- Logging out best-effort unregisters the token (`getExpoPushTokenIfGranted()`
  + `staffApi.devices.unregister()`) before revoking the session — skipped
  silently if permission was never granted.

**Customer app: still open, deliberately not built this pass.** The backend
only supports staff device tokens (`device_tokens.userId` references `User`,
not `Customer`; there's no storefront devices endpoint) — extending this to
customers needs its own backend change first (a customer-scoped table/
endpoint), not just mobile-side wiring, so it's out of scope here.

Real delivery (Expo push API / FCM / APNs) replacing `NoOpPushService` is a
deliberate post-MVP follow-up on the api side — nothing on the mobile side
needs to change when that lands.

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
