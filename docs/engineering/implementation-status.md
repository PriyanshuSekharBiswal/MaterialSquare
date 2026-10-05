# Implementation status

Status as of 6 October 2026. The product scope for this release is in
[Product Requirements](../product/requirements.md). Production data migration
and client content approval remain deployment tasks.

## Latest verification snapshot

- Commit `a4de6b6` is pushed to `codex/live-preview-20261005`. The root
  `npm run dev` command starts the customer web app and API together;
  `npm run dev:all` also starts the admin app.
- The customer OTP screen blocks verification of a code requested on localhost
  and directs the customer to request a fresh code on an approved HTTPS host.
  MSG91 CAPTCHA does not support localhost.
- `npm run build` passed for the types, API, customer app, and admin app. The
  latest customer build and type check pass. Initial customer JavaScript is
  356.88 KB (107.91 KB gzip); the map and smooth-scroll code load separately.
  The homepage's animated building canvas now waits until the browser is idle,
  so the hero text and search can become interactive first. This moved its
  7.17 KB (2.77 KB gzip) module out of the homepage's initial render path and
  reduced the homepage chunk from 20.09 KB to 13.65 KB (6.41 KB to 4.10 KB
  gzip). The entrance animation and map remain enabled.
  Five home category images total about 200 KB in WebP (previously about 1.4 MB
  as JPEG). Public API edge cache is 60 seconds with a 5-minute stale window.
- `npm test -- --runInBand` passed 197 API unit tests. The 19 database-backed
  integration tests were skipped because `TEST_DATABASE_URL` was not supplied.
- `npm run test:browser` passed all 63 browser flows.
- Local read-only smoke checks on 6 October returned 200 from the website shell,
  catalogue, site-content, partner-brand, and API readiness endpoints. Anonymous
  `/api/customer/me` returned the expected 401 (route exists, no session). Warm
  local responses measured about 0.10 s for the shell and 0.01–0.05 s for the
  three public APIs. These local timings do not establish live-network or cold
  start performance.
- The current live-test customer preview still reports that phone sign-in is
  not configured and disables its OTP button. Its Vercel Preview environment
  lacks the MSG91 widget build settings. The preview hostname also needs to be
  allowed by the MSG91 widget. Do not treat live customer authentication as
  verified until those are configured and a real OTP session is checked.
- The prior staging API check returned 401 for anonymous `/api/customer/me`,
  200 for `/api/products` with an empty catalogue, and 503 for
  `/api/health/ready`. The local readiness endpoint now returns 200; this does
  not prove the staging endpoint or its migrations are healthy. Recheck live
  API and migration state before client handover. Live authentication still
  requires configured MSG91 widget settings, CAPTCHA allowlisting, and a real
  OTP session.

## Current application behavior

- The public website reads published catalogue records from the database and
  supports search, product details, and a quote list stored in the visitor's
  browser.
- Search suggestions and catalogue facets are derived from the client catalogue.
- Product pages show saved attributes, variants, price, availability, minimum
  order, offers, and supplied images when present.
- Catalogue staff can generate variant combinations from up to five option
  groups, search and page through up to 1,000 sellable options per product, and
  maintain each option's client-supplied image, price, stock and attributes.
  The API caps listings at the same 1,000 options and request bodies at 5 MB.
- Availability is client-editable as in stock, out of stock, or check
  availability; out-of-stock products remain searchable and visible.
- Visitors can build a guest list; submitting a quotation request requires MSG91
  phone verification and saves a customer-linked RFQ for the operations queue.
  General enquiries still prepare a WhatsApp/email handoff.
- Public browsing and quote-list creation remain open. Customers can use
  MSG91 phone verification to access their own quotations, approved brand
  alternatives, orders, dispatch progress, purchase history, loyalty, and
  profile through separate account pages.
- The client manages catalogue and staff records through the protected workspace.
- The animated service-area map is on Home and Contact. Its office name,
  address, service area, and phone actions use client-managed website content;
  Google Maps directions stay disabled until the client enters an office
  address.
- The API process and production deployment do not seed products. Admins add
  only client-confirmed inventory, and listings stay out of public search until
  explicitly published. The cleanup migration hides the retired starter
  catalogue without deleting rows, so staff can review or remove them.
- Public site copy also masks the exact original preview phone, address,
  service-area, slogan, and promotional text if an older saved record survives
  a missed migration. Client-edited values are preserved. This prevents those
  old contact details from appearing while deployment migrations are caught up.
- Default privacy and terms copy is unpublished. The public pages and footer
  links stay hidden until a content administrator explicitly publishes the
  client-approved copy.

## Data migration

`202610050003_hide_preview_catalogue` hides the previous illustrative catalogue
records. `202610050004_remove_account_signin` preserves staging staff
credentials and customer CRM rows while retiring customer sign-in sessions.
`202610050005_remove_demo_scoping` removes retired demo partition columns.
`202610050006_restore_staff_access` ensures staff password storage exists, and
`202610050007_remove_customer_auth_state` removes customer OTP, session, login,
and saved-list structures while retaining customer contact and quote/order
records. `202610050010_customer_portal_sessions` restores hashed, revocable
customer web sessions without changing those records. `202610050011_catalogue_variant_images`
adds option-specific gallery images. `202610050012_unpublish_unapproved_catalogue`
unpublishes the retired starter records by stable slug and hides unchanged empty
drafts without deleting them. The last verified staging migration status was
through `202610050009_clear_unapproved_public_details`; verify migrations
`202610050010` through `202610050012` in staging before treating the preview as
client-ready. Temporary developer staff accounts are removed separately at
client handover. `202610050008_catalogue_availability_status` adds explicit
three-state availability and carries existing in-stock flags forward. Migrations
through `202610050009_clear_unapproved_public_details` were last confirmed in
staging; client production remains separate and is not configured yet.
`202610050009_clear_unapproved_public_details` removes the former compiled
phone, email, address, service-area, slogan, and social defaults from saved site
content only when those exact defaults are still present. Client-edited values
are preserved.

## Verification

Current verification commands:

```sh
npm run db:generate
npm run build --workspace=@material-square/types
npm run build:api
npm run build:web
npm run build:admin
TEST_DATABASE_URL=postgresql://... npm test
git diff --check
```

The latest local verification passed the full monorepo build, all 215 API
tests, all 61 Playwright browser flows, and `git diff --check`. The latest
browser run also confirmed draft privacy/terms copy stays hidden and client
content appears after staff explicitly publishes it. Subsequent
focused Playwright runs passed the customer empty-catalogue material-request
flow and the catalogue manager's first-product flow.
After raising the per-product option cap from 100 to 1,000 and adding searchable
10-option pages, the complete browser run passed 60 flows and exposed one stale
test expectation for the old cap; after correcting that expectation, the
affected admin catalogue flow passed. The full monorepo production build and
`git diff --check` also passed with the higher cap.
The follow-up browser run passed all 61 flows against the current source,
including 12 generated shade/pack combinations, search within the options,
and next/previous paging. A category URL opened with no published products
also displays a readable category label instead of `undefined`. The current
monorepo build passes. The current API
unit run passed 197 tests; its 19 PostgreSQL integration tests were skipped
because this shell has no `TEST_DATABASE_URL` and no local PostgreSQL listener.
The web build reports that `VITE_PUBLIC_SITE_URL` is not set in this local
environment, so absolute canonical URLs must still be set in the production
customer-site build configuration.
For database-backed verification, a fresh temporary PostgreSQL cluster then
applied all 40 committed migrations and all 216 API unit and integration tests
passed against its isolated database. The temporary cluster was used only for
local verification; this does not verify the hosted staging or production DB.
The current source also passes the full monorepo build and all 9 site-content
controller tests after adding the legacy-copy safety check. A live browser check
against the current local preview confirmed that a deliberately searched but
unpublished item returns the empty-catalogue state, and that old saved contact
values do not render in the customer header.
The API run
included all 19 PostgreSQL integration tests against a fresh, temporary local
PostgreSQL 14 database with the migrations available at that time. A separate
disposable PostgreSQL 14 database accepted all 40 current migrations through
`prisma migrate deploy`. The catalogue cleanup migration was also checked with
representative records: it hid an edited legacy starter slug and an unchanged
empty placeholder, preserved an approved listing and a configured variant
family, and deleted no rows. Browser flows use controlled API fixtures, so they
complement rather than replace a live database/API smoke test. The deployed
Vercel customer preview for commit
`452cc53` was last checked against the staging API: the database-backed
`UltraTech` search returned 14 matches across a catalogue with 50 starter
records, and the customer map appeared on Contact with routes and map-style
controls. The currently open public preview still returns 50 published starter
listings, including Berger paint entries outside the stated 17-brand roster.
Do not use it as a client-ready preview until migrations `202610050010` through
`202610050012` are applied and `/api/products` confirms only approved inventory
is public. The configured local `material_square_dev` database now has all 40
migrations applied; it contains 18 catalogue rows and no published listings,
so it is clean but does not yet contain client-approved products for a full
catalogue smoke test. The separate local `client-check` database used by the
existing API listener has all 40 migrations applied after a private backup;
its 51 saved catalogue rows are preserved but none are published. The live
local API returns zero products, and a browser smoke check confirmed the empty
catalogue path, request-to-Contact navigation, Home animation canvas, and Home
and Contact maps with no page errors. Production still needs verified MSG91 configuration, the
client-approved domain,
`VITE_PUBLIC_SITE_URL`, image storage, business content and catalogue approval,
database backup/restore verification, and client account provisioning.
