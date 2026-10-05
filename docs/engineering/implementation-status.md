# Implementation status

Status as of 5 October 2026. The product scope for this release is in
[Product Requirements](../product/requirements.md). Production data migration
and client content approval remain deployment tasks.

## Current application behavior

- The public website reads published catalogue records from the database and
  supports search, product details, and a quote list stored in the visitor's
  browser.
- Search suggestions and catalogue facets are derived from the client catalogue.
- Product pages show saved attributes, variants, price, availability, minimum
  order, offers, and supplied images when present.
- Availability is client-editable as in stock, out of stock, or check
  availability; out-of-stock products remain searchable and visible.
- Visitors review a request summary and continue through WhatsApp or email.
- Customer sign-in is removed; client admin and staff sign-in remain enabled.
- The client manages catalogue and staff records through the protected workspace.
- The API process does not seed implicitly; the staging launch command applies
  migrations, then idempotently inserts at least 50 editable starter families
  before the server starts. No generated product photos or invented rates are
  included.

## Data migration

`202610050003_hide_preview_catalogue` hides the previous illustrative catalogue
records. `202610050004_remove_account_signin` preserves staging staff
credentials and customer CRM rows while retiring customer sign-in sessions.
`202610050005_remove_demo_scoping` removes retired demo partition columns.
`202610050006_restore_staff_access` ensures staff password storage exists, and
`202610050007_remove_customer_auth_state` removes customer OTP, session, login,
and saved-list structures while retaining customer contact and quote/order
records. Temporary developer staff accounts are removed separately at client
handover. The migrations are committed. `202610050008_catalogue_availability_status` adds explicit
three-state availability and carries existing in-stock flags forward. These
migrations have been applied to the staging database; client production remains
separate and is not configured yet.
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

Typecheck, the full build, all 211 API tests (including PostgreSQL integration),
all 53 browser flows, and the diff whitespace check passed. The database tests
used a disposable local PostgreSQL cluster, which was removed afterward. The
staging Render API and Vercel customer/admin branch previews are live. A
production customer-site build still needs `VITE_PUBLIC_SITE_URL` set to the
client-approved domain and product-image storage configured.
