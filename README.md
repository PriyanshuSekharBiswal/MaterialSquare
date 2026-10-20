# Material Square

Material Square is a single-seller construction-materials marketplace with a React customer site, staff workspace, NestJS API, and PostgreSQL/Prisma storage. Visitors can browse published client inventory and prepare a local material list; signed-in customers submit it as an RFQ stored in their account and staff queue. General enquiries may open WhatsApp or email. Website payments are out of scope.

## Project layout

- `apps/web` — customer website, catalogue search, product details, quote list, and enquiry handoff.
- `apps/admin` — client and staff sign-in, catalogue management, staff roles, sales, and website operations.
- `apps/api` — public catalogue, content, enquiries, and protected operational APIs.
- `packages/db` — Prisma schema and ordered SQL migrations.
- `packages/types` — shared schemas, business copy, and application types. It contains no seeded product catalogue.
- `packages/storefront-ui` — product-detail presentation shared by the customer site and admin preview.
- `scripts` and `tests` — local/deployment utilities and isolated API/browser test suites.

## Local setup

Use Node.js 22.12+ and npm. Docker Compose runs PostgreSQL, Redis, and a local S3-compatible media service (Adobe S3Mock). Compose PostgreSQL is published on `127.0.0.1:55432` so it can coexist with PostgreSQL services using the common ports 5432 and 5433. The app's `DATABASE_URL` uses the Compose app database; API integration tests use a separate `material_square_test` database through `TEST_DATABASE_URL`, so tests never mutate the data used by the local storefront/admin. Media settings use the root `.env` values shown in `.env.example`, and media data is kept in the `s3mock_data` Docker volume.

```sh
npm ci
cp .env.example .env
npm run infra:up
npm run db:generate
npm run db:deploy
npm run build --workspace=@material-square/types
npm run dev:all
```

Keep one development command running while testing. Use `npm run dev:all` for the storefront, admin, and API; `npm run dev` starts the storefront and API only. Both start the API first, wait until the API/database readiness check passes, then start the frontend(s), and refuse a duplicate stack when an API is already responding on the configured port. The admin runs at `http://localhost:5174`, the API at `http://localhost:4000/api`, and the customer site at `http://localhost:5173` (which redirects to trusted HTTPS when the local certificate is configured). Use `https://material-square.localtest.me:5175` for customer OTP sign-in. API documentation is available at `http://localhost:4000/api/docs`.

The API reads the root `.env`. Both Vite apps proxy `/api` to port 4000 in development. For Vercel, set the private `API_ORIGIN` to the HTTPS API origin and leave `VITE_API_URL` unset. Database migrations run explicitly with `npm run db:deploy`. To enable PostgreSQL integration tests, create `material_square_test`, apply migrations to that database, then set `TEST_DATABASE_URL` to it when running `npm test`; never point the test URL at the app database.

For real OTP sign-in during development, the browser origin must provide Web Crypto to MSG91. The supported CAPTCHA hostname is `material-square.localtest.me`, but plain HTTP on that hostname is not a secure browser context and the provider widget cannot initialize. Set up a trusted local certificate once, then open the customer site at `https://material-square.localtest.me:5175/account`:

```sh
brew install mkcert
mkcert -install
mkdir -p apps/web/.local-certs
mkcert -cert-file apps/web/.local-certs/material-square.pem -key-file apps/web/.local-certs/material-square-key.pem material-square.localtest.me localhost 127.0.0.1 ::1
```

`brew install mkcert` uses the official Homebrew package. `mkcert -install` adds a local certificate authority to the computer/browser trust store; review and approve that trust step yourself. The generated root CA key can intercept secure requests from this computer, so never share it. Do not bypass a browser certificate warning. Add these local-only values to `apps/web/.env.local`:

```dotenv
VITE_LOCAL_HTTPS_CERT=.local-certs/material-square.pem
VITE_LOCAL_HTTPS_KEY=.local-certs/material-square-key.pem
```

With those files in place, Vite serves HTTPS on port 5175 at `https://material-square.localtest.me:5175`; use that address for customer sign-in. The HTTP storefront listener on port 5173 automatically redirects `http://localhost:5173` and `http://material-square.localtest.me:5173` to the secure storefront. Add `https://material-square.localtest.me:5175` to the API root `.env` `CORS_ORIGINS` and set `VITE_CUSTOMER_APP_URL=https://material-square.localtest.me:5175` in `apps/admin/.env.local` so admin preview links use the secure origin. Restart `npm run dev:all` after changing certificates or API environment. The admin stays at `http://localhost:5174` and the API at `http://localhost:4000/api`. Keep `MSG91_AUTHKEY` only in the API root `.env` and widget settings in `apps/web/.env.local`. Complete CAPTCHA before requesting a code. `VITE_ALLOW_LOCALHOST_OTP_TESTS` is reserved for automated browser tests with a mocked widget.

The admin workspace has no default or demo password. Staff must sign in with the phone number or email and password of an active account provisioned in the local database. Staff JWTs are kept in an HTTP-only, same-site cookie scoped to `/api`; the browser does not store bearer tokens in web storage. Staff sessions expire after 12 hours, and signing out clears the cookie. If a sign-in fails, check the account in the database and the API response; do not enable a development authentication bypass. Start one stack with `npm run dev:all`. The command stops the other processes if one exits. If it reports that an API or port is already in use, keep using the existing stack or stop it from the terminal that started it before launching another copy. During API watch rebuilds, Nest leaves the existing compiled output in place so a restart cannot delete modules that the running process is loading. Check API liveness at `http://localhost:4000/api/health` and database readiness at `http://localhost:4000/api/health/ready`.

## Catalogue and inventory

The public catalogue is read only from published `CatalogListing` records. The API never seeds products at startup, and deployment runs migrations only. Historical migrations add editable manufacturer/reference families and legacy starter rows for staff review; subsequent cleanup migrations keep them unpublished and clear their unapproved prices, stock, offers, minimums, and images. These drafts are not client inventory. Staff must replace or confirm all client-facing details against the client's actual inventory before publishing. See [catalogue data policy](docs/product/starter-catalogue.md).

A listing can contain brand and category details, product descriptions, specifications, sellable variants, colour or finish attributes, stock quantities, minimum order quantities, quantity breaks, prices, scheduled offers, and client-supplied product photos. Search suggestions, category links, and brand links are built from published inventory. Products with unavailable stock remain visible with an availability status.

The animated service-area map appears on Home and Contact. The client edits the office or depot name, address, service area, and phone through Website Content in the admin workspace. Google Maps directions and office details stay hidden until an office address is configured.

Product images must be supplied by the client. The website uses a neutral placeholder when an image is absent; it does not generate or substitute product photos. Published listings should use approved photos for the exact item and variant.

## Sign-in and account data

Customers can browse products and prepare a browser-stored quote list without signing in. Submitting a quotation request or opening account history requires a customer session. Customers sign in using their mobile number and a verified MSG91 OTP; there is no customer password login. The server issues a revocable HTTP-only session cookie that expires after 90 days of inactivity and renews as the customer uses the account. The session token rotates every 14 days, with a 15-minute overlap so concurrent account requests and delayed responses can finish. Another browser or device requires a new OTP sign-in, and explicit sign-out revokes the current session. Signed-in customers can review their own requests, published quotations and brand alternatives, order tracking, purchase history, loyalty activity, and profile. Admin and staff sign in separately with a mobile number or email plus password in the protected `/admin` workspace. Configure `MSG91_AUTHKEY` only on the API, and configure `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` for customer OTP sign-in. No OTP fallback code is included.

MSG91 is the current OTP provider in the codebase. The planned provider direction is Wa Bridge for OTP and future customer notifications/reminders. That migration has not been implemented or production-verified; keep provider credentials server-side and do not claim Wa Bridge support yet.

Payments are not collected by the website. Accounts staff record payments only after receiving them offline (cash, UPI, card, or another method), including advances and later balance payments. The order ledger records each amount, method, optional reference/note, staff member, time, and a unique 23-character payment reference; it prevents overpayment and keeps the remaining balance visible. Notification outbox records stay pending until a provider route is configured; queued records must not be treated as messages delivered.

### Existing notification code (deferred)

Notification queue, MSG91 SMS, and webhook code remains in the repository for future work. Notification delivery is deferred and has not been verified for this release. The configuration below documents the current code path only; it is not an instruction to enable production delivery. The planned direction is to evaluate Wa Bridge for OTP and notification/reminder workflows.

The current MSG91 path supports quotation publication, quotation expiry, scheduled SMS follow-ups, and dispatch updates. If that path is deliberately enabled for an environment, keep `MSG91_AUTHKEY` and template IDs in the API environment only, use the client's own MSG91 account, and use approved DLT templates. The web OTP widget remains a separate sign-in flow until the planned provider migration is implemented.

Template variables are passed in this order:

- `MSG91_SMS_TEMPLATE_ID_QUOTE_PUBLISHED`: `VAR1` quote number, `VAR2` valid-until date.
- `MSG91_SMS_TEMPLATE_ID_QUOTE_EXPIRY_REMINDER`: `VAR1` quote number, `VAR2` valid-until date.
- `MSG91_SMS_TEMPLATE_ID_QUOTE_FOLLOW_UP`: `VAR1` quote number. Staff notes remain internal and are not sent in SMS.
- `MSG91_SMS_TEMPLATE_ID_DISPATCH_UPDATE`: `VAR1` order number, `VAR2` dispatch status, `VAR3` truck number (or “Not assigned”).

The Sales follow-up scheduler includes SMS as a channel. Email and WhatsApp follow-ups, plus purchase-order emails with PDF attachments, continue through `NOTIFICATION_WEBHOOK_URL`. In production, configure an HTTPS endpoint and a unique `NOTIFICATION_WEBHOOK_TOKEN` of at least 32 bytes; the API sends it as a bearer credential and leaves events pending when authenticated delivery is not configured. Promotional messaging is not enabled by this adapter; it needs a separate consent-aware workflow and its approved promotional template. A notification is only marked delivered after MSG91 accepts the request; that does not confirm delivery to the handset.

Create the initial client administrator through the one-time staff provisioning operation. The client can then add staff accounts and assign roles in the workspace. Remove temporary developer test accounts after local testing and provision the client's real administrator for handover.

Migration `202610050003_hide_preview_catalogue` hides the former preview products. Migrations `202610050004_remove_account_signin` and `202610050007_remove_customer_auth_state` retired earlier customer-auth state while retaining CRM and business records. Migration `202610050010_customer_portal_sessions` restores only hashed customer session storage for the current phone-verified portal; it does not change customer CRM, RFQs, quotations, orders, or loyalty records. Remove temporary developer staff accounts and provision the client's administrator as a separate handover step. Apply migrations with `npm run db:deploy` in each environment.

## Operations

- If notification delivery is reactivated in a future release, it requires `REDIS_URL` and either `NOTIFICATION_WEBHOOK_URL` or configured MSG91 templates. Incomplete routes remain in the outbox as pending.
- Configure S3-compatible storage with the `AWS_*` values in `.env.example` before using media storage workflows.
- Set exact public origins in API `CORS_ORIGINS`; terminate TLS at the deployment proxy.
- Keep credentials out of source control. Store a unique client admin password outside the repository; the admin workspace supports staff and catalogue management.

## Build commands

```sh
npm run build --workspace=@material-square/types
npm run build:api
npm run build:web
npm run build:admin
```

## Quality checks

Run the API unit/integration suite only with an isolated database configured as
`TEST_DATABASE_URL`. The CI workflow applies migrations to its disposable
PostgreSQL service before testing.

```sh
npm run typecheck
npm test
npm run test:browser
git diff --check
```

`npm run test:browser` runs Playwright and may require the browser installation
performed by `npx playwright install`. Do not point `TEST_DATABASE_URL` at the
local app database or production. CI also builds all workspaces, runs the
production dependency audit, and verifies runtime dependencies.

## Architecture and product documents

- [Product requirements document](docs/product/PRD.md) — actors, scope,
  customer/staff flows, acceptance criteria, and release gates.
- [Product requirements and exclusions](docs/product/requirements.md) —
  current client scope and business constraints.
- [System design](docs/engineering/design.md) — application boundaries, API
  and data flows, security, deployment sequence, and prioritized design work.
- [Codebase review](docs/engineering/codebase-review.md) — repository-wide
  review results, fixes, release risks, and senior-level follow-ups.
- [SEO review](docs/engineering/seo-review.md) — crawl/index rules, page
  metadata, structured data, local search, AI search, and production checks.
- [Security review](docs/engineering/security-review.md) — auth and token
  controls, secret inventory, dependency advisories, and release hardening.
- [Code structure](docs/engineering/code-structure.md) — ownership and naming
  conventions for source files and features.
- [UI design system](docs/engineering/ui/UI_DESIGN_SYSTEM.md),
  [page inventory](docs/engineering/ui/UI_PAGE_INVENTORY.md),
  [UX audit](docs/engineering/ui/UI_UX_AUDIT.md), and
  [refactor plan](docs/engineering/ui/UI_REFACTOR_PLAN.md) — interface guidance
  and follow-up work.
- [Production readiness](docs/operations/production-readiness.md) —
  environment and release checks.
- [Manual QA checklist](docs/operations/manual-qa-checklist.md) — local
  storefront and admin release checks.
- [Implementation status snapshot](docs/engineering/implementation-status.md) —
  historical local QA evidence recorded on 8 October 2026; not current deployment status.
- [Deployment setup](deployment/vercel-render.md) — managed hosting details.
- [Starter catalogue policy](docs/product/starter-catalogue.md) — rules for
  non-client reference data.

The repository is a monorepo: `apps/web` is the customer site, `apps/admin` is
the staff workspace, `apps/api` is the REST API, `packages/db` owns Prisma
schema/migrations, and `packages/types` contains shared runtime schemas and
helpers. `packages/storefront-ui` contains UI shared by the customer product
detail and admin preview. For request flows and ownership boundaries, start at
[System design](docs/engineering/design.md).
