# Implementation status

Status as of 8 October 2026. The product scope for this release is in
[Product Requirements](../product/requirements.md). Production data migration
and client content approval remain deployment tasks.

## Current local verification — 8 October 2026

- Local Docker services are running: PostgreSQL 16 is healthy on loopback port
  55432, Redis is Up, and Adobe S3Mock is Up on loopback port 9000 with data in
  the `s3mock_data` volume. The running API now uses the standard Compose app
  database on 55432 rather than the separate Mac PostgreSQL service on 5432.
  The previous app database and Compose test database were preserved as
  recoverable local backups. The app data was copied into the Compose database;
  customer and admin sessions both survived the switch and reload. API database
  readiness returned HTTP 200; admin returned HTTP 200. The customer site uses
  the trusted local HTTPS origin
  `https://material-square.localtest.me:5175` and its HTTP listener redirects
  to HTTPS.
- The customer account is signed in on the local HTTPS browser. After a page
  reload it returned to the same account without asking for another login. The
  local admin stayed signed in through a reload, and the overview and website
  editor loaded the saved server draft. This verifies current-session reload
  behavior; it does not replace a fresh MSG91 OTP delivery check.
- The live catalogue manager currently reports 129 matching catalogue records
  and 0 published products. A QA-only product was published briefly to verify
  search, product details and quote-list entry, then unpublished; the storefront
  returned to its empty-catalogue state. This is the correct safe state until
  the client provides approved product names/specifications, prices, stock,
  offers, minimum quantities, and photos; QA/reference records must not be
  published as client inventory.
- The local storage service accepted an S3-compatible `PutObject`, returned the
  same bytes from `GetObject`, and the temporary QA object was removed. The
  admin upload and preview/publish control flow is covered by a
  fixture-backed browser test. The authenticated admin upload control was not
  exercised against the real local storage/API: Chrome's Codex extension
  currently blocks browser file selection unless its “Allow access to file
  URLs” setting is enabled. The user approved enabling it temporarily, but the
  browser tool refused to open Chrome's extension settings page and prohibits
  reaching that setting through another route. No image was uploaded and the
  permission remains unchanged. The API upload endpoint is covered by
  automated authorization and fixture-backed tests, not this manual check.
- `npm run build` passed for shared types, API, customer site and admin. It
  reports `VITE_PUBLIC_SITE_URL` unset, so production canonical URLs still need
  their approved domain configured in the customer-site build environment.
- `npm test -- --runInBand` with `TEST_DATABASE_URL` set to the separate
  `material_square_test` database passed 251 API tests across 29 suites after
  applying all 50 current migrations; no database-backed tests were skipped.
  The latest full `npm run test:browser` run passed all 82 flows in 2.4 minutes.
  An earlier full run had an intermittent quote-request OTP timeout; that flow
  passed by itself and in a clean 81-flow rerun before the latest 82-flow run.
  During live local QA, an already-authenticated customer submitted a 600-bag
  request without another OTP prompt, and the request appeared in both the
  customer account and admin RFQ inbox. `git diff --check` passed after the
  documentation updates as well.
- A follow-up storefront fix prevents the “Other items to explore” section from
  showing products that contradict an active exact search, availability, or
  variant filter. A live localhost check reproduced the former issue with an
  Out of stock filter, then verified zero results with no contradictory card.
  An unsigned-in QA session also kept its material-list item after refresh; the
  item was removed afterward. `npm run build:web`, the targeted Playwright
  regression, and the full browser suite all pass; the updated suite passed all
  82 flows in 2.4 minutes. The first sandboxed test attempt was denied permission
  to bind `127.0.0.1:4173`; rerunning with the required local-server permission
  succeeded.
- Manual local admin checks in this QA session exercised supplier inventory
  search and procurement shortage matching: 600 required minus 300 client
  stock produced a 300-bag supplier shortfall. Supplier ranking separates an
  exact delivery PIN from service-PIN coverage, then ranks by city and recorded
  rating. Two synthetic Noida suppliers offered 180 and 120 linked bags at
  ₹300 and ₹315 per bag, with 2-day and 3-day leads. The comparison totaled
  ₹54,000 and ₹37,800, and showed each quote's validity and QA-only note. The
  app sorted quotes by lead time. No purchase order was created or sent. A
  duplicate product attempt first exposed an API 500; duplicate supplier
  listings now return a clear conflict message, covered by the focused
  supplier-controller suite (4/4 passed) and verified in the live admin. Both
  QA suppliers were moved to Recently Deleted, and a fresh match excluded them.
  A further manual check linked one QA supplier to UltraTech and JK Cement
  packs; searching by each brand returned that supplier and its separate stock.
  This exposed UUID-only validation rejecting stable text catalogue IDs. The
  API now accepts bounded text IDs, and the pack selector prefills product,
  brand, category, and unit. This QA supplier was soft-deleted after checking.
  A second JK Cement pack under that same supplier then exposed the former
  product/brand uniqueness restriction. The schema now keys linked products by
  supplier and catalogue variant while preserving duplicate checks for
  unlinked records. The migration applied locally, the supplier controller
  suite passed 5/5, and both brand/packs were searchable before the test supplier
  was moved back to Recently Deleted.
  The explicitly marked QA sourcing
  request remains in local COMPARING state and must not be fulfilled. The QA
  catalogue product remains unpublished.
- Offline-payment scope now matches the client's clarification: the website
  never collects or verifies funds, while finance/admin staff can record the
  full order total as received by cash, UPI, or another offline method. The
  record includes an optional reference and staff/time audit trail. The local
  migration applied and API/admin builds passed. Orders & dispatch has no local
  orders right now, so the write flow remains manually unverified.
- The currently signed-in customer session belongs to a local QA record. Its
  quotation detail now has a clear page title, breadcrumb, and selected account
  navigation item so the current page is identifiable. The browser successfully
  retained it across reload; no new SMS was requested in
  this verification. MSG91 CAPTCHA must still be completed by a person before
  requesting a real test code. Do not use an automated OTP or CAPTCHA bypass.
- The app and test databases are now separate in Compose. The stable local
  startup steps are in [Local setup](../../README.md#local-setup):
  bring up Compose infrastructure once, apply migrations, then run one
  `npm run dev:all` process. If ports are occupied, use the existing processes
  instead of starting duplicates. After an API rebuild, wait for its ready
  status before retrying admin work.
- Production hosting, provider allowlisting and credentials, client-approved
  catalogue/content/images, canonical domain, backups and isolated restore, and
  client staff provisioning remain unverified release work.

## Earlier verification notes

Earlier dated build, preview, and staging observations below are historical and
should not be treated as current hosted-state checks. Browser tests use
controlled API fixtures; they complement but do not replace live database and
provider verification.

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
- The application does not collect or verify payments online. Authorized
  finance/admin staff can record offline receipt against the full order total,
  including method, optional reference, recorded time, staff, and an audit log.
  Legacy payment columns remain removed; the current manual-payment fields are
  internal tracking only.
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

A fresh isolated local test database applied all 50 current Prisma migrations
for the 8 October API integration run. This does not establish the migration
state of staging or production. The historical staging observations below were
not rechecked as part of this local verification.


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

Current checks run on 8 October 2026:

```sh
npm run build
npm test -- --runInBand  # set TEST_DATABASE_URL for PostgreSQL integration tests
npm run test:browser
git diff --check
```

The API suite passed all 251 unit and PostgreSQL integration tests across 29
suites using the local Compose PostgreSQL database with all 50 current migrations.
The browser suite passed all 82 flows on its final rerun in 2.4 minutes. A separate local SDK check wrote a QA
object to S3Mock, read back the exact bytes, then removed that object. Manual
browser verification confirmed both the customer account and admin workspace
remain signed in after reload. The authenticated media picker was not manually
verified because the current Chrome extension file-URL permission blocks file
selection; broadening that extension permission was not part of this test.

These checks do not establish a fresh MSG91 SMS delivery, the correctness of
client-provided commercial or legal content, production hosting configuration,
or production backup/restore readiness. The localhost product catalogue still
needs client-approved listings before public product search and detail pages can
be validated against real inventory. Set `VITE_PUBLIC_SITE_URL` to the approved
canonical HTTPS domain in the production customer-site build environment.
