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
npm run dev:all
```

The customer website runs at `http://localhost:5173`, the admin workspace at `http://localhost:5174`, and the API at `http://localhost:4000/api`. API documentation is available at `http://localhost:4000/api/docs`.

The API reads the root `.env`. Both Vite apps proxy `/api` to port 4000 in development. For Vercel, set the private `API_ORIGIN` to the HTTPS API origin and leave `VITE_API_URL` unset. Database migrations run explicitly with `npm run db:deploy`.

## Catalogue and inventory

The public catalogue is read from published `CatalogListing` records. The API never seeds products at startup. Render's pre-deploy step runs the idempotent `npm run catalog:seed-starter` operation: it adds 50 editable starter listings to a new database and leaves prices, offers, stock quantities, MOQs, colour/size variants, and product photos unset. Existing listings are never overwritten by the script. See [starter catalogue details](docs/product/starter-catalogue.md).

A listing can contain brand and category details, product descriptions, specifications, sellable variants, colour or finish attributes, stock quantities, minimum order quantities, quantity breaks, prices, scheduled offers, and client-supplied product photos. Search suggestions, category links, and brand links are built from published inventory. Products with unavailable stock remain visible with an availability status.

Product images must be supplied by the client. The website uses a neutral placeholder when an image is absent; it does not generate or substitute product photos. Published listings should use approved photos for the exact item and variant.

## Sign-in and account data

The customer site has no customer account or sign-in flow. The quote list is stored in the visitor's browser, then sent to the team by WhatsApp or email after the visitor reviews it. The client admin and staff use phone/password sign-in in the protected workspace at `/admin` to manage catalogue records and business operations. This V1 does not use a customer OTP provider.

Create the initial client administrator through the one-time staff provisioning operation. The client can then add staff accounts and assign roles in the workspace. Remove temporary developer test accounts after local testing and provision the client's real administrator for handover.

The migrations `202610050003_hide_preview_catalogue` and `202610050004_remove_account_signin` hide the former preview products and clear existing customer/staff account records. Migration `202610050006_restore_staff_access` restores staff password storage for the client workspace; it does not recreate any users. Migration `202610050007_remove_customer_auth_state` removes obsolete customer OTP/session and saved-list data structures; customers remain internal contact records for staff quotations and follow-ups. Apply migrations with `npm run db:deploy` in each environment. No hosted database has been changed.

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
