# Material Square

Material Square is a construction materials marketplace with a React customer site, a NestJS API, and PostgreSQL/Prisma storage. Customers can browse published client inventory, build a quote list, and send a request through WhatsApp or email. Website payments are out of scope.

## Project layout

- `apps/web` — customer website, catalogue search, product details, quote list, and enquiry handoff.
- `apps/admin` — client and staff sign-in, catalogue management, staff roles, sales, and website operations.
- `apps/api` — public catalogue, content, enquiries, and protected operational APIs.
- `packages/db` — Prisma schema and ordered SQL migrations.
- `packages/types` — shared schemas, business copy, and application types. It contains no seeded product catalogue.

## Local setup

Use Node.js 22.12+ and npm. Docker Compose can run PostgreSQL, Redis, and MinIO locally.

```sh
npm ci
cp .env.example .env
npm run infra:up
npm run db:generate
npm run db:deploy
npm run build --workspace=@material-square/types
npm run dev
```

`npm run dev` starts the customer website and API together. The customer site runs at `http://localhost:5173`, and the API at `http://localhost:4000/api`. Use `npm run dev:all` to start the admin workspace too; it runs at `http://localhost:5174`. API documentation is available at `http://localhost:4000/api/docs`.

The API reads the root `.env`. Both Vite apps proxy `/api` to port 4000 in development. For Vercel, set the private `API_ORIGIN` to the HTTPS API origin and leave `VITE_API_URL` unset. Database migrations run explicitly with `npm run db:deploy`.

For real OTP sign-in during development, open `http://material-square.localtest.me:5173/account`. This hostname resolves to the local computer and avoids hCaptcha's unsupported `localhost` hostname. Include `http://material-square.localtest.me:5173` in the root `.env` variable `CORS_ORIGINS`. Keep `MSG91_AUTHKEY` in the API's root `.env` and the widget settings in `apps/web/.env.local`. Complete CAPTCHA before requesting a code. `VITE_ALLOW_LOCALHOST_OTP_TESTS` is reserved for automated browser tests with a mocked widget.

## Catalogue and inventory

The public catalogue is read only from published `CatalogListing` records. The API never seeds products at startup, and deployment runs migrations only. Product listings must be entered and reviewed against the client's actual inventory in the admin catalogue; this repository does not generate sample product listings, prices, availability or variants. See [catalogue data policy](docs/product/starter-catalogue.md).

A listing can contain brand and category details, product descriptions, specifications, sellable variants, colour or finish attributes, stock quantities, minimum order quantities, quantity breaks, prices, scheduled offers, and client-supplied product photos. Search suggestions, category links, and brand links are built from published inventory. Products with unavailable stock remain visible with an availability status.

The animated service-area map appears on Home and Contact. The client edits the office or depot name, address, service area, and phone through Website Content in the admin workspace. Google Maps directions and office details stay hidden until an office address is configured.

Product images must be supplied by the client. The website uses a neutral placeholder when an image is absent; it does not generate or substitute product photos. Published listings should use approved photos for the exact item and variant.

## Sign-in and account data

Customers can browse products and prepare a browser-stored quote list without signing in. Submitting a quotation request or opening account history requires phone verification through the MSG91 widget and a server-verified, revocable HTTP-only session. Signed-in customers can review their own requests, published quotations and brand alternatives, order tracking, purchase history, loyalty activity, and profile. The client admin and staff use phone/password sign-in in the protected workspace at `/admin`; their role-based tools remain separate from the customer portal. Configure `MSG91_AUTHKEY` only on the API, and configure `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` for the customer-site build. No OTP fallback code is included.

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
