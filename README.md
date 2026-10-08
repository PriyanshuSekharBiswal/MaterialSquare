# Material Square

Material Square is a construction materials marketplace with a React customer site, a NestJS API, and PostgreSQL/Prisma storage. Customers can browse published client inventory, build a quote list, and send a request through WhatsApp or email. Website payments are out of scope.

## Project layout

- `apps/web` — customer website, catalogue search, product details, quote list, and enquiry handoff.
- `apps/admin` — client and staff sign-in, catalogue management, staff roles, sales, and website operations.
- `apps/api` — public catalogue, content, enquiries, and protected operational APIs.
- `packages/db` — Prisma schema and ordered SQL migrations.
- `packages/types` — shared schemas, business copy, and application types. It contains no seeded product catalogue.

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

The admin workspace has no default or demo password. Staff must sign in with the phone number or email and password of an active account provisioned in the local database. If a sign-in fails, check the account in the database and the API response; do not enable a development authentication bypass. Start one stack with `npm run dev:all`. The command stops the other processes if one exits. If it reports that an API or port is already in use, keep using the existing stack or stop it from the terminal that started it before launching another copy. During API watch rebuilds, Nest leaves the existing compiled output in place so a restart cannot delete modules that the running process is loading. Check API liveness at `http://localhost:4000/api/health` and database readiness at `http://localhost:4000/api/health/ready`.

## Catalogue and inventory

The public catalogue is read only from published `CatalogListing` records. The API never seeds products at startup, and deployment runs migrations only. Historical migrations add editable manufacturer/reference families and legacy starter rows for staff review; subsequent cleanup migrations keep them unpublished and clear their unapproved prices, stock, offers, minimums, and images. These drafts are not client inventory. Staff must replace or confirm all client-facing details against the client's actual inventory before publishing. See [catalogue data policy](docs/product/starter-catalogue.md).

A listing can contain brand and category details, product descriptions, specifications, sellable variants, colour or finish attributes, stock quantities, minimum order quantities, quantity breaks, prices, scheduled offers, and client-supplied product photos. Search suggestions, category links, and brand links are built from published inventory. Products with unavailable stock remain visible with an availability status.

The animated service-area map appears on Home and Contact. The client edits the office or depot name, address, service area, and phone through Website Content in the admin workspace. Google Maps directions and office details stay hidden until an office address is configured.

Product images must be supplied by the client. The website uses a neutral placeholder when an image is absent; it does not generate or substitute product photos. Published listings should use approved photos for the exact item and variant.

## Sign-in and account data

Customers can browse products and prepare a browser-stored quote list without signing in. Submitting a quotation request or opening account history requires phone verification through the MSG91 widget and a server-verified, revocable HTTP-only session. The customer session persists across browser restarts for up to a year and renews as the customer uses the account, so quotation, order, history, loyalty, and profile pages stay signed in on that browser. Explicit sign-out revokes the session. Signed-in customers can review their own requests, published quotations and brand alternatives, order tracking, purchase history, loyalty activity, and profile. The client admin and staff use phone/password sign-in in the protected workspace at `/admin`; their role-based tools remain separate from the customer portal. Configure `MSG91_AUTHKEY` only on the API, and configure `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` for the customer-site build. No OTP fallback code is included.

Create the initial client administrator through the one-time staff provisioning operation. The client can then add staff accounts and assign roles in the workspace. Remove temporary developer test accounts after local testing and provision the client's real administrator for handover.

Migration `202610050003_hide_preview_catalogue` hides the former preview products. Migrations `202610050004_remove_account_signin` and `202610050007_remove_customer_auth_state` retired earlier customer-auth state while retaining CRM and business records. Migration `202610050010_customer_portal_sessions` restores only hashed customer session storage for the current phone-verified portal; it does not change customer CRM, RFQs, quotations, orders, or loyalty records. Remove temporary developer staff accounts and provision the client's administrator as a separate handover step. Apply migrations with `npm run db:deploy` in each environment.

## Operations

- Redis/BullMQ forwards configured notification jobs to the notification adapter. Configure `REDIS_URL`, `NOTIFICATION_WEBHOOK_URL`, and its token.
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

See [Product Requirements](docs/product/requirements.md), [Code Structure](docs/engineering/code-structure.md), and [managed deployment setup](deployment/vercel-render.md) for product, codebase, and deployment details.
