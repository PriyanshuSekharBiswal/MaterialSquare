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

The API reads the root `.env`. Both Vite apps proxy `/api` to port 4000 in development. For deployment, serve the customer API under `/api` on the website origin, or on an HTTPS sibling subdomain under the same site, and configure exact website origins in `CORS_ORIGINS`. Customer sessions use HttpOnly, SameSite=Lax cookies (Secure in production); unrelated hosting domains will not support this session setup. Configure an API reverse proxy or use matching custom domains. Set `VITE_API_URL` accordingly. The root Vercel configuration deploys the customer website only; deploy the API and admin separately. Database migrations run explicitly with `npm run db:deploy`.

## Implemented flows

- The launch website prepares structured WhatsApp/email messages. Customers review the message and send it in their own app. The site does not claim delivery or record a submitted RFQ from this handoff. Existing staff RFQ APIs remain available for later workflows.
- Guest material lists persist in browser storage. Signed-in customer lists persist in PostgreSQL and populate the direct request form.
- Staff login verifies a scrypt password hash against an active database user. Tokens expire after eight hours. Staff routes reject anonymous and customer tokens; account deactivation takes effect on the next request.
- Admin loads saved RFQs, quotations, orders, enquiries, and catalogue pricing. Its chart uses recorded order values, not sample revenue.
- Staff enters rates when creating quotations. Publishing saves notification jobs in a database outbox in the same transaction. Dispatch updates also record an outbox job.
- Redis/BullMQ forwards outbox jobs to the configured notification adapter, with retries. Provider failures are stored in `notification_outbox.failedAt`. If Redis or the notification adapter is not configured, outbox records remain pending.
- Quotation and delivery-challan PDFs are generated on authenticated API requests. Public product responses omit internal pricing; the public website does not display prices.
- Quotation PDFs use a branded layout and fill in saved customer, quote, item, and pricing details. Configure seller identity with `QUOTE_SELLER_NAME`, `QUOTE_SELLER_ADDRESS`, `QUOTE_SELLER_PHONE`, `QUOTE_SELLER_EMAIL`, and `QUOTE_SELLER_GSTIN` in the root `.env`.
- `POST /api/storage/images` accepts a staff-authenticated multipart `file` (PNG/JPEG/WebP, up to 5 MB). Failed storage calls return errors rather than fabricated URLs.

The existing public catalogue still uses curated frontend product content. The database catalogue is managed separately at this stage. Quote/order line items currently use metric tonnes; the RFQ inbox accepts arbitrary materials and units. Full catalogue CMS, generalized quotation units, quote acceptance portal, role-specific permissions, procurement, and loyalty workflows are separate feature work.

## Provider configuration

No provider account is required for the database, admin, RFQ, and PDF flows. Missing provider configuration is reported explicitly.

**Customer OTP:** The website uses MSG91's OTP Widget custom Web SDK. Set `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` in the website environment, and set the private `MSG91_AUTHKEY` only in the API environment. The browser requests and verifies OTPs through the widget; the API verifies MSG91's access token before creating the long-lived customer session. Staff demo login is separate. Customer demo codes are not generated or displayed.

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

The normal development API reads the root `.env` and connects to the local `material_square_dev` PostgreSQL database on port 5432. Its restricted database role and private `.env` are created on this Mac; Prisma has applied all four migrations. Run `npm run dev:all` to use this database. The schema stores customers and sessions, staff, saved material lists, products and brands, quotations, orders, dispatch records, audit logs, notifications, and staff follow-ups. The new development database starts empty; the public catalogue is still curated in frontend code and has not been moved into database-managed catalogue tools.

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

## Launch preparation

See [deployment instructions](deployment/README.md) for HTTPS routing, private PostgreSQL, migrations, staff creation, health checks and backup/restore procedures. Docker is unavailable locally, so container builds and live hosting remain unverified. See [client content review](docs/launch-content-review.md) for business details requiring approval. Real OTP activation remains deferred.

Product detail forms accept separate sizes and quantities for the same catalogue product. Each selection remains a separate list line and appears in the WhatsApp/email request. The selected specification is shown over the representative image, without inventing dimensions on the product itself.

## Demo and first-release staff workspace

Run `npm run demo` for persistent local account testing with MSG91 customer login and staff mobile/password login. See [demo testing instructions](docs/demo-testing.md) for multi-device checks and data separation. The current staff workspace contains customer accounts, saved material lists and manual follow-ups; the earlier quotation/order screens remain archived for later work.

For GitHub + Vercel + Render, follow [managed deployment setup](deployment/vercel-render.md). Cloud resources and real OTP delivery are not activated by these files.
