# Material Square

TypeScript monorepo with a React customer website, React staff app, NestJS API, and PostgreSQL/Prisma persistence.

## Local setup

Use Node.js 22.12+ and npm. Docker with Compose is the easiest way to run PostgreSQL, Redis, and MinIO locally. Existing installations can also be used by changing the URLs.

```sh
npm ci
cp .env.example .env
# Replace JWT_SECRET with a freshly generated random value.
npm run infra:up
npm run db:generate
npm run db:deploy
npm run build --workspace=@material-square/types
```

Create a staff account by setting `STAFF_EMAIL`, `STAFF_NAME`, and `STAFF_PASSWORD` in your shell or local `.env`, then run `npm run staff:create`. Use at least 12 characters for the password. The command creates an account; it does not silently overwrite existing credentials. Remove the bootstrap password from `.env` afterwards. Never commit credentials.

```sh
npm run dev:all
```

- Customer website: http://localhost:5173
- Staff app: http://localhost:5174
- API: http://localhost:4000/api
- API documentation: http://localhost:4000/api/docs
- Local MinIO console: http://localhost:9001

The API reads the root `.env`. Both Vite apps proxy `/api` to port 4000 in development. Vercel uses a same-origin serverless proxy in each app: set the private `API_ORIGIN` to the HTTPS API origin in both projects, and keep `VITE_API_URL` unset. Configure the exact customer and admin website origins in API `CORS_ORIGINS`. Customer sessions use HttpOnly, SameSite=Lax cookies (Secure in production). Database migrations run explicitly with `npm run db:deploy`.

## Implemented flows

- The launch website prepares structured WhatsApp/email messages. Customers review the message and send it in their own app. The site does not claim delivery or record a submitted RFQ from this handoff. Existing staff RFQ APIs remain available for later workflows.
- Guest material lists persist in browser storage. Signed-in customer lists persist in PostgreSQL and populate the direct request form.
- Staff login verifies a scrypt password hash against an active database user. Tokens expire after eight hours. Staff routes reject anonymous and customer tokens; account deactivation takes effect on the next request.
- The V1 dashboard shows customer and follow-up counts plus first-party aggregate page views, product-detail opens, add-to-list actions, and WhatsApp/email link clicks for the last 30 days. It does not estimate unique visitors or traffic sources.
- Staff can search customer accounts and review saved material lists, create and update follow-ups, manage staff accounts, assign predefined roles, and manage published product descriptions, images, prices, offers and availability.
- Development and demo databases seed 22 illustrative catalogue families with sample prices for testing; all stock starts unavailable. The V1 production API deliberately does not seed this preview data: its catalogue starts empty, and client staff must add and approve real products before publication.
- Redis/BullMQ forwards outbox jobs to the configured notification adapter, with retries. Provider failures are stored in `notification_outbox.failedAt`. If Redis or the notification adapter is not configured, outbox records remain pending.
- Website quotation/PDF generation, checkout/payment, order fulfilment and customer quote history are outside the agreed V1. The V1 request form prepares a WhatsApp or email message; customers review it and press Send in their own app. The site cannot confirm delivery.
- Legacy quotation/PDF APIs remain in the repository for a separately scoped later release; they are not part of the active V1 customer or staff workflow.
- The staff catalogue editor uploads approved PNG/JPEG/WebP product images up to 5 MB through the staff-authenticated `/api/storage/images` endpoint. Configure S3-compatible storage before enabling uploads in production; failed uploads show an error rather than a fabricated URL.

Role access is enforced by API guards as well as hidden staff navigation. V1 staff assignment is limited to Administrator, Sales & Customer Support, and Catalogue & Pricing Manager; roles for procurement, dispatch, accounts and website content are reserved until those panels ship. Owners cannot create custom permission sets. Website analytics aggregate event counts only; the client must approve their privacy notice and retention policy. Client staff must verify all business claims and enter real prices and promotions before publication.

## Provider configuration

No provider account is required for the database, admin, RFQ, and PDF flows. Missing provider configuration is reported explicitly.

**Customer OTP:** The website uses MSG91's OTP Widget custom Web SDK. Set `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` in the website environment, and set the private `MSG91_AUTHKEY` only in the API environment. Set SMS as the widget's primary channel and disable Voice: initial sends follow the widget account configuration, while the code explicitly selects SMS for retries. The API verifies MSG91's access token before creating the customer session. Staff demo login is separate. Customer demo codes are not generated or displayed.

**Notifications:** Configure `REDIS_URL`, `NOTIFICATION_WEBHOOK_URL`, and its token. The adapter receives a job type and record identifiers. Handle `quote-published`, `quote-expiry-reminder`, and `dispatch-whatsapp-alert`; use the `Idempotency-Key` header to prevent duplicate delivery after retries. Failed jobs remain in Redis for inspection/retry. The outbox does not claim a message has been delivered until the adapter returns success.

**Storage:** Create `material-square-assets` in MinIO. Configure the `AWS_*` variables in `.env.example`. `AWS_S3_PUBLIC_URL` must point to the bucket's actual readable media base URL, including any bucket path. Use public access only for catalogue images. Customer documents and RFQ attachments need a separate private-bucket download workflow; they are not uploaded by the image endpoint.

The API applies an in-process IP limiter to public submission/auth routes. Use a shared gateway limit when running multiple API instances. Always terminate TLS at the deployment proxy. Do not use the example development credentials in production.

## Verification

```sh
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

`npm test` runs authentication, validation, and storage-failure tests. PostgreSQL integration tests are enabled only when `TEST_DATABASE_URL` points at an isolated migrated test database:

```sh
TEST_DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/material_square_test npm test
```

These integration tests create and remove test business records, check staff/customer access boundaries, generate a quotation PDF, and restart the app to verify RFQ persistence. Never point them at production. Browser tests mock account responses to check sign-in, logout, list persistence/conflicts, complete WhatsApp/email messages, mobile layout, and staff sign-in. The PostgreSQL tests additionally verify account separation, cookie sessions, expiry, logout revocation and list version conflicts. Real provider delivery remains an integration check after credentials are configured.

GitHub Actions runs typechecking, builds, PostgreSQL integration tests, and Chromium browser tests on pull requests and pushes to `main`.

`npm run infra:down` stops the local containers while retaining their volumes.

### Development and demo databases

The normal development API reads the root `.env` and connects to the local `material_square_dev` PostgreSQL database on port 5432. Its restricted database role and private `.env` were created on this Mac. All 14 migrations in the current checkout, including the V1 staff activity, managed catalogue, offer scheduling and aggregate analytics changes, are applied to this local development database. On first API startup, an empty development/demo database receives 22 illustrative product families and rough sample prices for functional testing; stock stays unavailable. Production does not seed the preview catalogue, so client-approved listings must be entered in the staff panel before launch.

`npm run demo` uses a separate PostgreSQL cluster under `.local/demo-postgres` on port 55440 with demo-scoped customer records and staff credentials. Customer login still uses MSG91. Stop that process in its terminal before starting the normal API on port 4000. Keeping the databases separate prevents demo records from entering the regular development environment.

Styling continues to use CSS. Jest/Supertest and Playwright cover testing; Vitest is not required alongside Jest.


## Customer accounts and direct requests (October 2)

- Header Login / My Account, OTP verification, profile editing, logout and a fixed 30-day session are implemented. New customers add their name after verifying their mobile. Returning customers use their existing number. The raw session token is held only in an HttpOnly cookie; PostgreSQL stores its SHA-256 digest. Logout revokes the current device session. Other devices remain signed in.
- Apply migration `202610020001_customer_accounts` with `npm run db:deploy` before using account routes. It adds customer profile city, material list/version and session records without removing existing data.
- Guest lists remain in browser storage. Signing in merges guest-only items into the saved account list; the saved account version wins for duplicate IDs. Account lists include quantity, unit and requested specification, save to PostgreSQL, and use version checks to reject conflicting writes. Logout clears the browser view, not the database list. Saving failures are displayed.
- `/get-quote` asks for verified mobile, name, full address, city and PIN, optional company/delivery date/notes, and email when email is selected. A preview prepares a message, then opens WhatsApp or the customer's mail app. A copy fallback supports long lists or unavailable handlers. Contact-page enquiries remain available to guests with their own message format. Product enquiries include product identity.
- Request/quotation/order history is **not** provided by this release. Messages sent outside the website cannot be inferred as delivered or imported into account history.
- Customer sign-in always requires MSG91 OTP verification, including in demo mode. Demo mode only affects staff/demo data scoping and staff credentials.
- Product artwork: all 18 catalogue entries now use category-appropriate studio illustrations, explicitly labelled illustrative. These are representative renders, not exact manufacturer photographs. Manufacturer size/specification verification and client approval remain pending. Existing brand logos and brand text were preserved.

### Product illustration prompt

Saved asset: `apps/web/public/images/products/cpvc-pipe-illustration.png`.
Built-in image generation prompt: photorealistic studio catalogue illustration of three light ivory CPVC straight pipe lengths, visible circular open ends, neutral pale grey background, soft shadow, square composition; no logos, text, dimensions, certification stamps or invented branded markings. Brand and specifications remain separate website text.

## Current hosted test deployment

The customer and admin Vercel projects are deployed from GitHub `main`, with the NestJS API on Render's Free demo service. The new catalogue release is prepared for that test environment: it adds measured product variants, gallery images, search by size/pack, and admin controls for variant prices, dated offers and stock. The database migration and API restart seed/backfill the preview catalogue; until the new API deployment completes, the hosted marketplace may still show the earlier catalogue. A live MSG91 SMS send and complete owner/staff workflow have not been verified against the hosted environment.

Do not use the free demo database for client data: Render Free Postgres expires after 30 days and has no backups. Production still requires the paid/persistent API and PostgreSQL resources in the root Render blueprint, client domain/DNS, private production secrets, storage, client-approved catalogue and policies, backups/restore checks, and a real SMS test. The API deploy predates the last frontend-only copy correction; it contains the same current V1 API code. See [managed deployment setup](deployment/vercel-render.md), the [client launch checklist](docs/client-launch-inputs.md), and [content review](docs/launch-content-review.md) for exact prerequisites.

Automated verification completed for the current code: TypeScript typecheck, production builds, 50 API tests (34 passed; 16 database-dependent tests skipped in this sandbox), 17 browser acceptance tests, Prisma schema validation, and `git diff --check`. The GitHub workflow runs the database-backed integration suites with PostgreSQL. These checks do not replace the pending live SMS, storage, production backup and client acceptance checks.

The staff catalogue supports separate sellable pack/size/colour variants with their own units, price, offer dates, stock quantity and gallery. Customer selections retain their variant and clearly labelled indicative estimate in the saved material list and WhatsApp/email draft; final price and stock are reconfirmed by staff. New demo entries start unavailable until staff confirm inventory.

## Demo and first-release staff workspace

Run `npm run demo` for persistent local account testing with MSG91 customer login and staff mobile/password login. See [demo testing instructions](docs/demo-testing.md) for multi-device checks and data separation. The current staff workspace contains customer accounts, saved material lists and manual follow-ups; the earlier quotation/order screens remain archived for later work.

For GitHub + Vercel + Render, follow [managed deployment setup](deployment/vercel-render.md). The customer-facing test site and staff panel are already deployed; the original client's production environment and approvals remain to be completed.
