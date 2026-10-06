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

Each app's API base URL comes from `EXPO_PUBLIC_API_URL`, read by its
`app.config.js` into `expo.extra.apiUrl`. When it's unset, the app falls back
to `app.json`'s `http://localhost:3000/api/v1`. On a phone, `localhost` is the
phone itself, so copy `apps/<app>/.env.example` to `.env.local` (git-ignored)
and point it at your machine's LAN IP. For EAS builds, set it in the build
profile's `env` in `eas.json` instead. The `preview` and `production`
profiles already target the deployed api,
`https://yws.yordeniscorreoso.com/api/v1`.

The customer app also reads `EXPO_PUBLIC_STOREFRONT_ROOT_DOMAIN`, the web's
`storefrontRootDomain` (`yws.yordeniscorreoso.com` in production). With it,
pasted `<slug>.<root>` share links are parsed the same way the web parses
them. Without it, a generic rule is used.

### Running on a device

The SDK 52 apps need a development build, because the store's Expo Go only runs
the latest SDK. Both apps are linked to EAS projects (`extra.eas.projectId`)
and ship `expo-dev-client`:

```bash
cd apps/staff                                   # or apps/customer
eas build --profile development --platform android
npx expo start --dev-client                     # customer: add --port 8082
```

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

## Staff app: store settings

The Ajustes tab is the store's own configuration, at parity with the web
admin's `StoreSettingsPage` — the seller no longer needs a desktop to change
the logo, a policy, the Zelle recipient or the payment credentials. It's an
index over seven sections under `app/store-settings/` (general, appearance,
social, sales channels, payments, policies, email), each saving on its own.

Three things about it are not arbitrary:

- **Sections save independently.** Each save sends only its own fields. The
  api runs with `forbidNonWhitelisted: true`, so a round-tripped tenant object
  would be a 400 — and a full-object save would also overwrite whatever
  someone changed on the web since the screen loaded.
- **The role gates the UI, not the api's answer.** `PATCH /tenants/current`
  and both payment-settings endpoints are `@Roles('OWNER')`. A collaborator
  gets the read-only view and an explanation, and the owner-only queries never
  fire for them.
- **A payment save requires the provider's full credential set.**
  `PUT /tenants/current/payment-settings` replaces the stored (encrypted)
  credentials with whatever it receives and never returns them, so saving a
  blank form is how a store loses working keys — which is what the web panel
  does today. `paymentCredentialsError()` in `packages/shared` is the guard.
  Zelle is the exception that prefills: its recipient is public by design
  (`GET /tenants/storefront/:slug`'s `zellePaymentInfo`), so editing the
  instructions can't blank it.

Known gap, api-side: there's no endpoint that flips a provider's `isEnabled`
without the credentials, so **turning Stripe or MercadoPago off from the app
means retyping the keys**. The screen says so.

## Customer app: what it covers

It mirrors the web storefront. These are the parts that need context:

- **Checkout methods.** WhatsApp, Telegram and Zelle, each shown only when
  the store has it enabled (`whatsappEnabled`, `telegramEnabled`, or the
  presence of `zellePaymentInfo`). For Zelle, the customer uploads the payment
  screenshot (`expo-image-picker`) after the order exists, from the
  confirmation or order screen. It never blocks placing the order.
- **Shared links (Android App Links).** `https://yws.yordeniscorreoso.com/store/...`
  opens the app when it's installed. The intent filter is in
  `apps/customer/app.json`. The web serves
  `/.well-known/assetlinks.json` (in `yorde-what-store-client`) with the
  SHA-256 of the app's EAS signing certificate. If that keystore ever
  changes, update the fingerprint there. The app's routes use the same paths
  as the web storefront: `product/<id>`, `order/<id>`, `login?token=`, and
  the four policy pages.
- **Images.** The api returns `/uploads/...` relative to its own origin, so
  every image goes through `mediaUrl()` (`createMediaUrlResolver` in
  `packages/shared`).
- **Visits.** Each store screen logs a pageview (`POST /storefront/visits`)
  with its own anonymous per-install id. Orders send the same id, so the
  dashboard's conversion rate counts app shoppers. That id is deliberately
  not the `deviceId`, which binds refresh tokens.
- **Share links** use `EXPO_PUBLIC_STOREFRONT_URL`. It falls back to the
  api's origin, which is the same domain in production.

## What's deliberately not done yet

- **Stripe/MercadoPago checkout.** These need the in-app-browser and
  deep-link-return flow that the web client uses (`createStripeCheckout` /
  `createMercadoPagoCheckout`), adapted for `expo-web-browser`.
- **iOS Universal Links.** These need an Apple Developer Team ID for
  `apple-app-site-association`. Until then, iOS opens shared links in the
  browser.
- **App icons/splash screens.** `app.json` has no `icon`/`splash` keys yet,
  because no brand assets were available. Expo uses its own placeholder
  until real assets are added.
- **Screen and E2E tests.** `pnpm test` runs `packages/shared`'s unit tests
  (api clients, refresh/session handling, stores, utils). They go through a
  fake axios adapter (`src/test-utils/fake-adapter.ts`) instead of the
  network. Both apps have `jest-expo` wired up but no screen tests yet, and
  there's no E2E suite.

## Design tokens & theming

`packages/tokens/src/storefront-themes.ts` is kept byte-for-byte in sync with
`yorde-what-store-client/src/config/themes.ts` — a tenant's `theme` column
renders the same brand colour on the web storefront and in the customer app.
The staff app uses its own fixed brand (`packages/tokens/src/palette.ts`,
`staffBrand`), independent of any tenant, matching that the staff app is the
platform's own tool rather than a per-tenant storefront.
