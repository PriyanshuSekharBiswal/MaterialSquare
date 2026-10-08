# Product requirement audit — 8 October 2026

This audit maps the release checks in [Product requirements](../product/requirements.md)
to current code and local verification. “Implemented” describes product behavior;
it does not imply that client data or production services have been approved.

**Current-state note:** The table is a historical audit snapshot. The later
sections named “Follow-up verification,” “Latest local QA pass,” and
“Verification refresh” supersede any conflicting table evidence. At the
latest code-side checkpoint, all 58 migrations are applied to the app and
isolated test databases; the API suite passes 31/31 suites and 276/276 tests,
and web/admin/API builds pass. The single `npm run dev:all` stack now waits for
API/database readiness before starting either frontend and rejects duplicate
launches. Live post-fix image verification remains open because the browser
tool reports a saved access preference blocking the customer HTTPS site, even
after user authorization. No real offline payment or physical delivery was
recorded.

**Fresh verification refresh — 8 October 2026:** From the current checkout,
`TEST_DATABASE_URL=... npm test` passes all 31 API suites and 276 tests with no
skips; the isolated PostgreSQL integration flow includes the 19/19 database
workflow checks. Both
`material_square` and `material_square_test` are up to date against all 58
Prisma migrations. The storefront, admin, and API production builds pass. API readiness returns HTTP
200, and the expected API/storefront/admin HTTP and HTTPS ports are listening.
The storefront build still warns that `VITE_PUBLIC_SITE_URL` is unset. This
refresh does not include live browser verification: Codex's saved access
preference still blocks the local customer/admin pages.

**Latest access retry — 8 October 2026:** The user confirmed they changed the
saved browser-access preference and authorized another attempt. Codex still
rejected both `https://material-square.localtest.me:5175` and
`http://localhost:5174` with the same saved-preference block. Process/listener
inspection confirms the local API (4000), storefront (5173/5175), and admin
(5174) servers are running. No browser workaround was used; live UI and OTP
checks remain open until the saved Codex setting actually permits access.

| Requirement                                                         | Current evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Status and remaining work                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published catalogue, search, filters, variants, and product details | Admin search/filters for brand, category, publish status, availability and text, name sorting, pagination and clear were manually exercised. With a published QA item, storefront product/brand search suggestions opened the correct product or brand filter; brand and availability filters updated counts, and invalid quantity 0 was rejected against MOQ 1. A guest added the QA product to Material List, refreshed, saw it persist, then removed it. The item was unpublished and a fresh storefront load returned to 0 published products. Browser fixtures exercise variants and mobile layouts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | The QA item has no client description or approved photo; only one pack was available, so variant switching and image behavior were not live-tested. The actual client catalogue is not populated. Approved listings, prices, stock, offers, minimum quantities and photos are required before client-content behavior can be verified. Do not publish QA/reference drafts as client inventory.                                                                                                                                                                  |
| Guest material list and enquiry handoff                             | Browser list works without an account; WhatsApp/email handoff text is prepared for customer review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Implemented and browser-tested; an external handoff is not proof that a message was sent or delivered.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Quote request with verified phone                                   | The signed-in customer has a 600-bag QA request in the local account and staff RFQ inbox. A separate plan-only request is visible in both places with its attached PDF. Staff’s “Prepare quotation” opens a linked editor prefilled with the request customer and delivery fields; the catalogue loaded for item selection. No quote was saved or published during this check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Existing-session and plan-only request paths are visible locally. Fresh OTP delivery remains unverified; MSG91 CAPTCHA and real-code entry require the user.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Project drawing and BOQ attachments                                 | Get Quote accepts up to ten PDF/JPEG/PNG/WebP files (100 MB each) and allows plan-only requests. A local plan-only request has a 0.2 MB PDF; both the signed-in customer account and admin RFQ inbox show its filename, size, and download link. Code review found that the customer download handler ended the HTTP response before piping an S3-compatible private-storage stream. This is fixed. API regression tests check stream behavior, customer ownership scoping, and legacy database-backed downloads. On 8 October, the admin clicked the existing RFQ attachment again; Chrome saved `20x45-Model (8).pdf` (158,318 bytes), a valid one-page PDF, and its SHA-256 matched the original `20x45-Model.pdf`.                                                                                                                                                                                                                                                           | Existing attachment download now passes in live customer and admin sessions. Fresh file selection and a new authenticated upload roundtrip remain unverified because the Chrome file chooser bridge blocks `setFiles`. The upload UI and API enforce ten files and 100 MB per file, but live boundary-size behavior was not exercised. No automatic quantity takeoff is claimed; staff review plans with customers and final quantities need professional verification.                                                                                       |
| Customer account, ownership, and persistent session                 | Signed-in customer moved among quotation, orders, brand comparison, purchase history, loyalty, and profile pages. The quotation list now prioritizes issued quotes with item, quantity, price, total, status, and a prominent open action. Request details expand inline; unanswered requests explicitly say no quotation has been issued. Existing quotes link to their source request when one is known. The quotation detail has a breadcrumb, descriptive title, labeled quote number, and active Quotations navigation. At a compact desktop viewport, the floating quick-action dock overlapped its summary; it is now hidden on account routes. Quote detail and request expansion were manually opened; widths 320px and 390px had no horizontal overflow.                                                                                                                                                                                                                                                                                                                                                             | Session continuity across routes and reload verified, though one transient generic account-service error occurred and recovered; its root cause is unconfirmed. Browser-restart persistence and fresh provider login remain unverified in this pass. Historical QA quote had no source-request relation and therefore remains unassociated. Staff editor prefilled the source RFQ; no new quote was published because publish can enqueue a customer notification. Loyalty is correctly inactive until the business enables/approves its rules.                 |
| Business pages, CMS, policies, and service-area map                 | Home, Why Us, Guides, Blogs, Experts, Contact, Marketplace and Get Quote rendered locally. Website Editor draft saving survived navigation; private preview remained unpublished. The live office address, phone, email and map link populate Contact and the animated route map. The current service-area field is blank; the map now shows an explicit unconfigured message and no hard-coded region buttons, route paths or city markers on Home or Contact. Configured Delhi NCR and individual Noida/Greater Noida routing are covered by focused browser checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Local presentation and blank/configured routing are verified. Final business details, policies, catalogue copy, imagery and public claims still need client approval. Google Maps, call and WhatsApp destinations were inspected but not launched.                                                                                                                                                                                                                                                                                                              |
| Protected admin, staff roles, and business operations               | Super-admin overview remained available; global search found the QA product, customer and Procurement destination and opened the expected workspace. All three Operational Reports tabs loaded. Recent activity showed the QA supplier removal, product unpublish and procurement changes with actor/time. API/browser suites cover permissions and staff management.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Local session and operations are verified. Client staff accounts and hosted deployment still need provisioning.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Payments                                                            | Client staff confirmed that no payment is collected online; staff mark an order paid only after receiving cash, UPI, or another offline payment. The local schema stores method, optional reference, time, and recording staff; the finance permission gates the API and the service writes an audit entry. The Accounts Manager browser flow verifies the explicit offline-only confirmation, method/reference form, and always-visible paid attribution. API unit tests cover role permissions, atomic write, audit details, already-paid prevention, and concurrent updates. Migration `202610080001_manual_order_payment_record` is applied locally.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | There is no gateway, checkout, or online payment verification. The local Orders & dispatch view has no orders, so no persistent payment write was performed against the app database. Verify with a clearly QA-labeled order before release.                                                                                                                                                                                                                                                                                                                    |
| Internal supplier sourcing and procurement                          | Staff-only supplier/product search ranks exact delivery PIN, service-PIN coverage, city, then rating; candidates show supplier location and service PINs. A live QA request for 600 bags with 300 in client stock produced a 300-bag shortfall. Two Noida suppliers linked to the same QA catalogue pack offered 180 and 120 bags; the quote totals calculated to ₹54,000 and ₹37,800, with lead times of 2 and 3 days. One additional QA supplier was linked to UltraTech and JK Cement packs; searching either brand found it with separate stock. The same supplier accepted two distinct JK Cement packs and displayed both in search results. Selecting a catalogue pack now prefills product, brand, category, and unit. Testing exposed UUID-only validation that rejected stable text catalogue IDs and an old uniqueness rule that blocked multiple packs. Both are fixed; supplier controller tests pass 5/5. The app sorted offers by lead time; offers were synthetic/unconfirmed. No PO was created or sent. Duplicate product conflicts show useful messages. All test suppliers were moved to Recently Deleted. | Multi-supplier allocation, one-supplier/multi-brand listings, multiple packs under one supplier, supplier search, catalogue linking, and duplicate validation were verified locally. The QA requests and comparisons remain marked QA-only in local COMPARING state; they must not be fulfilled. Supplier availability remains an internal indication until a current supplier quote is confirmed; client supplier data must replace QA records.                                                                                                                |
| Image storage                                                       | Docker S3Mock is healthy; an S3-compatible upload/read-back returned identical bytes, and the QA object was removed. The browser suite covers the admin upload/preview flow with fixtures.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Service connectivity verified. The user approved temporarily enabling Chrome's extension file-URL access, but the browser tool refused navigation to Chrome extension settings and prohibits reaching the same setting through alternate means. No image was uploaded through the signed-in admin. The setting remains unchanged; manual upload verification awaits the user changing it directly in Chrome.                                                                                                                                                    |
| Build, database, and browser verification                           | Monorepo build passed; all 57 migrations are applied to the local app database. The API suite passes 249 tests (19 skipped; one integration suite skipped without `TEST_DATABASE_URL`), including customer/staff attachment regression coverage and primary-owner role protection. The browser suite passes 85/85, and local API health/readiness previously returned healthy/ready.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | API tests and builds pass. The customer PDF downloads successfully in live Chrome from both the account and admin RFQ inbox; the latest admin file is a valid 155 KB PDF whose SHA-256 matches the original. Local browser sessions remain signed in. The build warns that `VITE_PUBLIC_SITE_URL` is unset, so production canonical URLs need environment configuration. Staging/production migrations, fresh provider delivery, and backup/restore still need separate verification. |

## Additional localhost verification — 8 October 2026

- Reran the complete Playwright browser suite with its temporary local web
  servers: **85/85 passed** in 2.4 minutes. It exercised quote submission and
  OTP states, service-area configuration, privacy/terms draft visibility,
  staff follow-ups, RFQ and quotation editing, suppliers/procurement, audit
  filters, notification setup, and offline payment flows. Real MSG91 provider
  delivery and Chrome file selection remain outside this fixture-backed suite.
- Reran the full API suite after the audit-log redaction change: 29 suites
  passed, 249 tests passed, and 19 tests were skipped. The separate integration
  suite remains skipped because `TEST_DATABASE_URL` is not configured.
- Confirmed in the current source that customer sessions set an HttpOnly
  `ms_customer_session` cookie with a 365-day max age; the customer guard
  renews it when fewer than 30 days remain, and explicit logout revokes the
  server session and clears the cookie. The renewal unit test verifies the
  one-year database expiry and cookie attributes. Browser-close/reopen
  persistence is still not verified in the signed-in customer browser.
- Checked the privacy and terms pages in a fresh customer-facing localhost tab.
  Both routes show only the “being reviewed and is not published yet” notice.
  In the signed-in admin Website editor, both policies are marked “Draft only,”
  their public visibility checkboxes are off, and the internal review notes are
  staff-only. Draft policy copy is not exposed to visitors; legal/client approval
  remains necessary before publishing.
- Repeated the customer-uploaded plan download from the signed-in admin RFQ
  inbox. The file saved as `20x45-Model (8).pdf`; `file` identified a valid
  one-page PDF and SHA-256 matched the original download. The admin tab was left
  on Quotations & Orders → RFQ inbox. The earlier `ERR_BLOCKED_BY_CLIENT`
  observation did not reproduce in this live check.
- Audit security review found that `/api/admin/audit` returned database
  metadata without filtering secret-like keys, although `/recent` uses a safe
  response shape. The paginated endpoint now recursively redacts password,
  OTP, token, credential, cookie, session, API-key, auth-key, and private-key
  values, including before/after values for sensitive field-change entries.
  The focused API suite passes 19/19 and `npm run build:api` passes. Live
  response verification is still open: the API watch process compiled the
  change but its attempted restart reported `EADDRINUSE` because another API
  process already held port 4000. The current listener is PID 5329, with its
  working directory in `apps/api`; the existing service was left running.
  Refresh the intended API process before validating the admin audit detail
  view.
- Rechecked the admin Quote follow-ups panel. It lists local QA quotations and
  offers WhatsApp, email, and internal reminders plus cancellation for
  scheduled reminders. Submitting with no time triggers the browser's required
  field validation without creating a record. No customer-channel reminder was
  scheduled. In the latest pass, cancelled an existing scheduled internal task
  on the QA rejected quote; then scheduled a future internal-only task for
  9 Oct 2026 at 12:00 with a QA-only note, confirmed `SCHEDULED`, cancelled it,
  and confirmed `CANCELLED`. No external notification was sent. The interface
  has no scheduled-time edit path, and no reminder completion action is exposed,
  so those lifecycle states remain unverified.

- Rechecked the running customer, admin, and API endpoints. The API health and
  database-readiness endpoints returned HTTP 200/`ready`.
- Admin navigation previously left the Website Editor's section hash in the URL
  while showing a different workspace page. Top-level workspace tabs now write
  `?workspace=<tab>`, clear stale CMS section hashes, and restore the selected
  page on refresh and browser Back/Forward. Manually verified Sales and Business
  navigation, refresh persistence, and Back navigation in the signed-in admin.
- A plan-only request now opens quotation creation with one blank material line,
  and the editor derives a six-digit PIN from the saved request address when
  prepopulating the quotation. The PIN `201301` was visible on the live QA
  request. Admin TypeScript and production builds pass.
- Storefront Home, Marketplace, Why Us, Guides, Blogs, Experts, Contact, Get
  Quote, and customer account routes rendered at 320 px with no horizontal
  overflow; Get Quote and Contact also passed at 390 px. A signed-in customer
  profile remained accessible in a new browser tab. Full admin mobile and
  browser-restart session checks remain open.
- The first full monorepo build caught missing `@types/multer` and an untyped
  attachment list in the API. Added the official declarations, typed the
  Prisma attachment input, and reran `npm run build`; types, API, storefront,
  and admin builds now pass. The storefront build reports that
  `VITE_PUBLIC_SITE_URL` is unset, so the crawler build omits absolute
  canonical URLs until the production build environment supplies it.
- Remaining manual checks are still listed in `manual-qa-checklist.md`; in
  particular, authenticated file upload/download, real OTP delivery, product
  image selection, offline-payment write flow, and client-approved content/data
  still need separate verification.

## Follow-up defect found during this audit

When the storefront had no products matching an active search, availability, or
variant filter, its empty state could also show related products that violated
that exact filter. With the QA cement item, the “Out of stock” filter returned
zero matches but still suggested the same item marked “Check availability.”
Related suggestions now remain available for broader brand/category browsing
but are hidden while exact search, availability, or variant filters are active.
The live browser reproduced the corrected zero-result state with no
contradictory suggestion. The targeted Playwright regression passed, the full
browser suite passed 82/82, and `npm run build:web` passed. The first sandboxed
test attempt was denied permission to bind 127.0.0.1:4173; rerunning the
requested local test with the required local-server permission succeeded.

## Local runtime

The checked-in Compose stack uses port 55432 for PostgreSQL because this Mac
already has PostgreSQL listeners on 5432 and 5433. The API now points at the
Compose app database; a separate `material_square_test` database receives
integration-test writes. The prior local app database and previous test
database were backed up and preserved. Redis and S3Mock remain on loopback
ports 6379 and 9000. Customer and admin sessions both survived the database
switch and a browser reload. See [local setup](../../README.md#local-setup) for
the single-stack workflow.

## Follow-up verification — 8 October 2026

- The full browser suite passes **85/85**. The focused customer quote flow,
  request details, quotation detail, mobile Material List access, admin content
  publishing, and staff RFQ status flow also pass after aligning checks with the
  current interface.
- `npm test` passes: 28 API suites, 238 tests passed, 19 skipped. The monorepo
  `npm run build` passes for shared types, API, storefront, and admin. The
  storefront build still warns that `VITE_PUBLIC_SITE_URL` is unset, so
  production crawler output needs the production site URL configured.
- Live Chrome inspection confirmed the customer page is titled “Your requests
  and quotations,” separates issued quotes from “Your material requests,” and
  clearly says when no quote has been issued. The customer remains signed in.
  The live admin RFQ inbox opened “Prepare quotation” with customer, site, PIN,
  requested line, catalogue choices, and a message that the published quote
  will appear under that request. A local draft was visible; no quote was
  published or notification queued.
- The live admin page was checked at Chrome 400% zoom to trigger its compact
  breakpoint. The desktop sidebar collapsed to “Toggle navigation menu”; the
  menu opened with the workspace destinations and a close control. Zoom was
  restored to 100%. This visually verifies the compact navigation but does not
  measure true 320px/390px horizontal overflow.
- Editing a published blog entry in the live admin originally showed its
  storefront-relative featured image as unavailable, although the asset
  existed and rendered on the customer site. Admin image previews now resolve
  relative asset paths against the configured customer-site URL. The live admin
  preview displays the image; the focused browser regression passes and the
  admin production build succeeds. The edit was canceled without saving.
- The live Notification Status page identifies the missing
  `NOTIFICATION_WEBHOOK_URL`, says the optional token is absent without
  revealing secrets, and lists two pending jobs. No per-job detail view or
  retry-setup action is currently exposed. Delivery remains unverified until
  the client configures an approved local webhook destination and token.
- Website Editor showed the service-area field blank while the storefront
  header still displayed hardcoded Delhi NCR cities. The header now renders
  only the configured `contact.location` value; blank configuration hides the
  location chip. Browser checks pass for both empty and configured service
  areas. The client must enter and approve the actual coverage before it is
  shown publicly; office/map draft values were inspected but not published.
- The live audit log filtered 8 October 2026 by exact action
  `SUPPLIER_DELETED` and entity type `SUPPLIER` (8 rows). One expanded detail
  contained only a QA supplier name and expiry. This single sample does not
  establish secret filtering across every action type; role-by-role audit
  visibility still needs review.
- The admin RFQ inbox and customer account now tolerate old request responses
  without an `attachments` property. The bug was reproduced by browser fixtures
  and fixed at both render sites. Requests without files now submit as JSON;
  requests with files retain multipart upload, and the API accepts both body
  shapes. Browser and API suites pass with this compatibility change.
- Offline payment is explicitly an accounts/admin action. The role matrix and
  API unit tests cover allowed roles, recorded method/reference/staff/amount,
  audit logging, duplicate prevention, and concurrent update conflicts. The
  admin browser flow confirms the action labels it as an offline record (no
  funds are collected or verified) and now leaves the PAID method, reference,
  timestamp, and staff attribution visible on the order card. The local
  database has no QA order, so a persistent local payment write was not made.
- The signed-in customer’s historical rejected quote has no source request ID;
  it remains unassociated rather than being guessed onto a QA request.
- Rechecked the signed-in admin Staff & Roles page: the local workspace contains
  only the primary owner, displayed separately from the assignable role list.
  Added API controller tests proving `SUPER_ADMIN` cannot be assigned on create
  or edit and the primary owner's role/access cannot be changed. The separate
  staff-account sign-in matrix remains untested because there are no disposable
  role accounts in the local workspace.
- Manually refreshed all 14 top-level admin workspaces: Overview, Recent
  changes, Customers, Enquiry follow-ups, Quotations & orders, Business
  management, Recently deleted, Operational reports, Products & pricing,
  Website editor, Staff & Roles, My account, Audit log, and Notifications.
  Each returned to its loaded page without a visible alert or persistent
  loading state. Workspace-specific filters and data-edit actions remain
  covered only where noted elsewhere in this audit.
- The customer plan download endpoint ended its response before streaming files
  from private object storage. Removed the premature response close and added
  controller regression coverage for customer ownership scoping, staff and
  customer stream handling, legacy database-backed downloads, valid plan-only
  upload persistence, rejected file signatures, and temp-file cleanup. The
  admin inbox also used a plain download link for a `StaffGuard`-protected
  endpoint, so it sent no staff bearer token. Replaced it with an authenticated
  fetch and file download. Live Chrome marked the uploaded
  `20x45-Model (1).pdf` as Done (155 KB); the browser regression verifies the
  bearer header and filename. The signed-in customer account also downloaded
  the same attachment; Chrome marked `20x45-Model (5).pdf` Done (155 KB).
  A new file selection is still blocked by the browser bridge, so a fresh
  upload and the 10-file/100 MB limits remain unverified in a live browser.
- Remaining manual checks are in `manual-qa-checklist.md`, particularly a real
  authenticated plan upload/download, a fresh MSG91 CAPTCHA and OTP,
  product-image upload through Chrome, offline-payment recording with a QA
  order, complete role-by-role permissions, and client-approved catalogue and
  business content. Mock browser fixtures do not prove these actions.

- The live service map showed six static Delhi-NCR destinations while the client-managed service-area field was blank. Route buttons, animated paths, and city markers now render only for regions configured in `contact.location`; blank configuration shows an explicit confirmation message while retaining the office map. The signed-in Chrome storefront confirmed the empty state on Home and Contact. Three focused browser tests passed and `npm run build:web` passed.
- The signed-in customer account has a plan-only request with a 0.2 MB PDF. Its request details show the attachment and the staff RFQ inbox lists the same name/size. Live Chrome verified downloads from both authenticated views: `20x45-Model (1).pdf` from admin and `20x45-Model (5).pdf` from the customer account, each 155 KB and marked Done. Controller/browser regressions cover private-storage streaming and authorization. A fresh browser upload remains open because file selection is blocked by the browser bridge.
- Requirements review found the historical reference-catalogue migrations left researched but unapproved variant prices and image URLs in unpublished admin drafts. Added `202610080006_clear_unapproved_catalogue_values`; a read-only local check found 121 targeted reference listings, zero listings with unapproved price/stock/offer/MOQ/image values, and zero variants with those values. A second check found 19 known legacy starter listings and four variants still had seeded stock, minimums, or third-party images. The automatic review blocked that bulk cleanup until a backup existed, so a private local snapshot was saved at `/private/tmp/material-square-legacy-starter-catalogue-backup.json`; added and applied `202610080007_clear_legacy_starter_values` against only those named rows. Verification returned 19 listings and zero remaining unapproved listing or variant values. No rows were deleted; all remain unpublished/editable. The live admin refresh shows reference packs as “Price not set,” with availability and minimum order unconfirmed; storefront published count remains zero. Both cleanup migrations run after historical inserts on new databases.
- The full Playwright browser suite passed 85/85 after the public brand-directory change and marketplace brand-filter fix. The first sandboxed attempt could not bind its test server; the rerun with local test-server permission completed successfully.
- The live Home previously showed a hard-coded 17-brand “authorised partner” list even though the database had no published products or saved client brand directory. The public API now returns only an explicitly saved active directory; the admin still has its editable starting roster. On refresh, the signed-in Chrome storefront showed no brand marketing with an empty client directory and zero published products. API unit tests passed 8/8, and focused browser tests passed for the empty catalogue and configured brand-search path. The full 85-test suite passed after the brand-directory change and follow-up marketplace filter fix.

- Repeated the admin RFQ attachment download in the current Chrome session after the user reported a failure. The inbox showed `20x45-Model.pdf`; clicking it created `20x45-Model (7).pdf` in Downloads. `file` identifies a one-page PDF (155 KB), and its SHA-256 matches the original download. The in-page alert stayed clear. Playwright's download-event hook did not observe this app-created blob download, but the actual browser file and matching checksum prove it completed.
- Manually exported the Sales & quotations report for 1–8 October 2026. The CSV contains the same two quotation references, current statuses, one item each, and ₹1 totals shown in the filtered report table; it does not include customer contact details. The report's default 1–8 date range was used for the export; the previously applied 7–8 range remains an on-screen manual check.
- Read-only quotation QA confirmed the saved local draft is revision 2 replacing revision 1. The audit log filter returned exactly one `QUOTATION_REVISION_CREATED` event, attributed to Admin User, with quote number, source revision ID, revision number, line count, and comparison count. The draft contains only QA-labelled material and a comparison option; it was not edited or published.
- Reopened the browser's recovered `QA LOCAL ONLY - Draft workflow check 2026-10-08` product form and inspected both marketplace-card and product-detail private previews. Title, ₹1 QA price, 50 kg pack, availability-check state, MOQ, description and feature appeared consistently; preview controls were disabled and the page stated the draft was hidden from customers. This recovery was already in the browser; it was not changed or saved. Image and multi-variant preview remain unverified.
- In the signed-in customer Get Quote form, created an unsent QA preview with material A in 40 kg and 50 kg options at 25 and 3 bags, plus material B with a 20 mm QA specification at 10 kg. The review repeated all three lines and quantities. No submission or OTP request occurred. Removed every QA line, restored the quote list to zero, cleared synthetic contact fields, and returned to the account page; the existing session and quotation/request history remained available.
- Directly opening the local HTTP storefront redirected to the configured trusted HTTPS URL. This confirms the HTTP-to-HTTPS local setup but does not verify a fresh CAPTCHA/OTP sign-in or a blocked-widget message on HTTP.
- Attachment UI advertises PDF/JPG/PNG/WebP, multiple files, 10-file and 100 MB per-file limits; the storefront validates both and the API interceptor enforces the same count/size. I generated local synthetic fixtures and attempted the supported chooser flow; Chrome blocked `setFiles` because the extension's “Allow access to file URLs” setting is off. The input remained empty, no file was submitted, and fixtures were removed. Therefore live 10-file/100 MB rejection, preview, and upload/download roundtrip remain unverified.

## Continued localhost checks — 8 October 2026

- Repeated the signed-in admin download of the customer-submitted `20x45-Model.pdf`. Chrome saved `20x45-Model (9).pdf` (158,318 bytes); `file` identifies a valid one-page PDF. No admin download error appeared. The admin attachment path is working; Chrome saves it to the Downloads folder.
- Filtered the live admin audit log by 8 October, `SUPPLIER_CREATED`, and `SUPPLIER`; four rows appeared. Expanding a row showed only `status: ACTIVE`. This confirms live filtering and detail rendering, but that ordinary record does not exercise the secret-value redaction branch. Unit tests cover redaction; the version of the API process currently serving localhost remains unconfirmed after the prior watcher `EADDRINUSE`.
- Exercised the admin blog lifecycle with `QA ONLY — Blog workflow check 2026-10-08`: save draft, reopen/edit, staff-only preview, publish, verify listing and article detail on the storefront, then archive. The archived test article disappeared from the public listing and direct route and was left archived in admin. No image was attached; upload/image preview remains open with the browser file-chooser limitation.
- Exercised the full local catalogue workflow with `QA ONLY — Catalogue publish check 2026-10-08`: created a two-pack UltraTech QA product, saved as draft, reopened it to confirm persistence, checked the private preview, published it, and found it through a fresh storefront load. Product details showed the description/specifications and both pack options; selecting the second option changed the price from ₹1 to ₹2. Added it to Material List, changed the selected pack and confirmed the price updated, then removed it and confirmed the list was empty. Edited and unpublished the product; a fresh marketplace search no longer found it and the direct product route reported it was unavailable. The QA record was moved to Recently Deleted afterward. No image was attached, so image upload and preview remain unverified.
- The storefront tab already mounted before publishing retained its prior product list until a full page reload. A fresh load displayed the published QA item, and a fresh load after unpublishing removed it. Real-time catalogue refresh in an already-open customer tab is not currently verified or required by the checklist.
- The admin attachment download was repeated in Chrome and the user confirmed it is working. The downloaded `20x45-Model (9).pdf` is a valid one-page PDF (158,318 bytes); no error was shown in the admin page.
- Reviewed live Business Management discount, loyalty, transportation, and quotation rules. Empty discount submission correctly required a rule name and created no record; no pricing rule was saved without approved commercial terms. Loyalty remains disabled with zero/unconfigured values. Empty transportation-plan submission required an Order ID and created no delivery. Quotation rules currently set 48-hour validity and queue-on-publish plus a 24-hour expiry reminder; no notification setting was changed, and no quote was published because external notification delivery is unconfigured.
- Inspected commission entry without saving. Submitting the empty form focused the required Beneficiary name field; no commission record was created because client eligibility and approval policy are not configured.
- Reopened the QA request in the staff RFQ inbox. Its line item, requested quantity, delivery PIN, and QA-only note appeared in “Prepare quotation,” with the source-request link. Expanded saved quotation details: the existing QA draft shows its item/pack, quantity, unit rate, subtotal, discount, tax, freight, validity, and a JK Cement comparison price. The separate rejected quote also shows its line/totals. No quote was altered or published during this inspection.
- Checked the signed-in customer quotations page against that linked QA request. The request still says no quotation has been issued while the staff quote is DRAFT, and only the separate previously published/rejected quotation appears in the customer-facing quote list. This is consistent with drafts staying private. The customer session remains signed in on its original account page.
- Rechecked the live Get Quote upload control: its visible instructions say PDF/JPG/PNG/WebP, up to 10 files and 100 MB each, private to the customer and authorized staff. The runtime file input has the same accepted formats and enables multiple selection. No file was selected or submitted; the browser bridge still blocks a fresh upload roundtrip.
- Opened the live admin Orders & dispatch view. It states “No orders recorded yet,” confirming there is no local order on which to record an offline cash/UPI payment. No payment record was created; a QA order or an actual confirmed purchase is needed for that persistence check.
- Verified the implemented order/dispatch design in current code: a customer acceptance of a published, valid quotation creates an order at `PROCESSING_AT_YARD` and starts internal procurement for any stock shortfall. Accounts/admin roles can record the full order total as already received by cash, UPI, or another offline method; the API stores method/reference/time/staff and an audit entry, and rejects duplicate paid updates. Authorized dispatch staff create a challan with truck/driver, weighbridge weights, and ETA; net weight and a transportation record are saved, then staff advance the five-step dispatch tracker. Completing it marks delivery and records remaining quantities. These are manual operational updates; there is no payment gateway or claim of live GPS. The end-to-end order/payment/challan path remains unverified in the live database because no order exists and acceptance would create an actual order from a customer-confirmed quote.
- Published a temporary `Local QA preview` homepage badge in the local admin editor. After refreshing the customer storefront, verified the badge was the only changed homepage section; the heading, links, and remaining copy were unchanged. Restored and republished `Browse without an account`, refreshed again, and confirmed the original public copy. Privacy and terms remained unpublished. The browser still has both the customer account and admin sessions open; admin was left on the Website editor during this check.
- Added a clearly marked local-only enquiry follow-up with a `do not contact or fulfil` address and internal QA note. The form's validation rejected an all-zero phone and PIN; after correcting them with the QA request's local values, the record saved. Changed its status from New to Closed, updated the note to say no external contact or fulfilment occurred, reopened it, and confirmed the saved status and note. The form has no owner-assignment control. No WhatsApp, email, customer contact, reminder, or delivery was sent.

## Latest local QA pass — 8 October 2026

- Reran the isolated Playwright browser suite on the current checkout: **85/85 passed** in 2.4 minutes. It covered customer quote request/OTP states, catalogue and mobile flows, admin role and content paths, supplier procurement, dispatch, reports, reminders, and manual offline payment controls. Its fixtures do not prove a real MSG91 delivery, live file selection, a received payment, or physical fulfillment.
- Reran `npm test`: **29 API suites passed, 249 tests passed, 19 skipped**. The integration suite remains skipped because `TEST_DATABASE_URL` is not configured. `npm run build:web` and `git diff --check` also passed in this pass; the storefront build still warns that `VITE_PUBLIC_SITE_URL` is unset for absolute crawler canonical URLs.
- Fixed the customer quotation response panel shown in the reported screenshot. The brand selector and notes field now stack below their labels and use the full available width; action and confirmation buttons have consistent styles and wrap on narrow layouts. Live Chrome showed the corrected desktop layout after hot reload. A narrow viewport could not be reliably set through the browser bridge, so this exact panel's mobile rendering remains unverified.
- Prepared and published a clearly labeled symbolic QA quotation from customer request `6722502D`. The customer quotation view showed the linked request, 600 bags, ₹600 total, and response controls. The customer accepted it during the authorized local end-to-end check, creating order `MS-ORD-2026-2f8d6178-a679-4109-afc6-e75ccb7f731c`; both customer Orders & tracking and admin Orders & dispatch show the same order. This is QA data only: no payment was recorded, no physical fulfilment occurred, and the quotation's ₹1 unit rate is not a commercial offer.
- Inspected the offline-payment form on that order. It explicitly describes payment as money received outside the website and offers Cash, UPI, or Other with an optional reference. Left it UNPAID because no money was received.
- Saved a QA-only transportation plan marked `PLANNED` for the same order, with a no-delivery destination and simulated operator/vehicle. Did not issue a challan or advance dispatch; the customer order remains `PROCESSING_AT_YARD`. No physical delivery occurred.
- The admin notification status page reports that `NOTIFICATION_WEBHOOK_URL` is not configured and lists six pending jobs. No external notification was sent; quote notification delivery remains unverified until an approved local webhook is configured.
- Rechecked the live browser after the prior QA pass: the signed-in customer account opened Orders & tracking with the QA order marked `PROCESSING AT YARD`; the signed-in admin opened Notifications and showed the expected unconfigured-provider state and six pending jobs. Docker Compose reports PostgreSQL `healthy`, Redis `Up`, and S3Mock `Up`. The Docker daemon status required host access because the workspace sandbox cannot read its socket; no containers or data were changed.
- Latest manual pass: quit and relaunched Chrome, then confirmed customer account and `SUPER_ADMIN` admin sessions both remained active. On Get Quote, submitted only a synthetic `QA_ONLY_upload_test.pdf` request with explicit no-contact/no-fulfil notes; request `5385EFCF` appeared in customer Quotation requests and staff RFQ inbox. Both views listed the same attachment and exposed their respective download actions, which were exercised. No quotation, order, payment, delivery, or external notification was created by this upload. The checked-in quote request now reuses an existing customer session and clearly explains that another sign-in is unnecessary; the UI displayed the verified customer phone and Submit quotation request action. The earlier checklist note saying fresh file selection was blocked is superseded by this live upload result.
- `npm run build:web`, `npm run build:admin`, `npm run build:api`, `npm test` (**29 suites passed, 249 tests passed, 19 skipped; database integration suite skipped without `TEST_DATABASE_URL`**), the current full Playwright suite (**85/85 passed**), and `git diff --check` passed after the session-aware request-form change. The browser security policy rejected inspecting Chrome’s internal downloads page and explicitly barred alternate routes to that page, so the actual downloaded file bytes were not independently checked in this pass. The temporary “Allow access to file URLs” permission is awaiting the user's change back to OFF before the final Chrome restart/session-persistence check.
- Further requirement pass: in the admin product editor, a generated non-branded 512×512 QA PNG uploaded to S3Mock and appeared in the draft preview. Saving exposed that local `.env` returned an HTTP loopback URL which the API correctly rejected (and which would be mixed content on the HTTPS storefront). Updated the local S3 public URL to the trusted customer HTTPS origin, added Vite proxy routes in web/admin for `/material-square-assets`, and added a development-only URL mapping for existing loopback S3Mock configuration. Added a StorageService regression; **250 API tests now pass**, and storefront/admin/API builds pass. Chrome denied a later request to the local HTTPS origin, so live post-fix save/reopen/remove and storefront rendering remain unverified; no product draft was saved with the QA image, and the uploaded file remains as an unused synthetic media asset.

## Verification refresh — 8 October 2026

- Inspected the running local processes and found four API development watchers
  competing for port 4000. The active API child belonged to an old standalone
  watcher; newer watchers had encountered `EADDRINUSE`, which could leave
  Chrome showing stale backend behavior. Stopped the duplicate local dev
  process trees and started one clean `npm run dev:all` supervisor. One web,
  admin, and API process now own their intended ports; PostgreSQL, Redis, and
  S3Mock stayed running. No application database reset was performed.
- Checked migration state: all 57 migrations are applied to
  `material_square`. Backed up the separate `material_square_test` database to
  `/private/tmp/material-square-test-db-before-integration-XXXXXX.dump`,
  applied its seven pending migrations, and ran the full API suite against it:
  **30 suites passed, 269 tests passed, 0 skipped**, including the integration
  suite's customer session, account ownership, quotation, order acceptance,
  dispatch and delivery lifecycle, role access, and notification coverage.
- Reran `npm run build:web`, `npm run build:admin`, and `npm run build:api`;
  all pass. The storefront still warns that `VITE_PUBLIC_SITE_URL` is unset,
  which affects generated absolute canonical URLs in production output.
  `git diff --check` passes.
- The test database is separate from the app database and was backed up before
  migration and integration-test writes. The app database and existing QA
  customer/order records were left intact.
- Live Chrome verification is still blocked until the user confirms that
  access to both local sites is allowed and the temporary extension file-URL
  permission is off. The user has now explicitly authorized both local sites,
  but the browser tool still reports a saved access preference blocking the
  customer HTTPS URL and forbids alternate access methods. Specifically, the
  post-fix admin image save/reopen/remove and storefront rendering remain
  unverified. No fresh OTP was requested; live offline-payment recording and
  physical dispatch were not performed.
- Extended the isolated PostgreSQL integration flow to record a synthetic
  UPI payment against its test-only order, verify persisted attribution and
  audit metadata, and reject duplicate payment recording. The same test now
  creates a test dispatch challan, verifies its PDF, advances the dispatch
  stages, and confirms completed delivery. The full test suite passes with
  **30 suites and 269 tests, zero skipped**; these are test-database records,
  not real payments or physical deliveries.
- Fixed the local stack startup race: development commands previously started
  the API and Vite apps simultaneously, producing `ECONNREFUSED` requests
  while the API compiled. `npm run dev:all` now starts the API, waits for
  `/api/health/ready`, then launches storefront and admin; default
  `npm run dev` uses the same gate before starting the storefront alone. Verified the
  `dev:all` start had no frontend API-proxy errors and a duplicate launch exits
  with a clear message without starting another stack. The single local stack
  remains running.
- Follow-up runtime check: `/api/health/ready` returns HTTP 200; Compose reports
  PostgreSQL healthy, Redis up, and S3Mock up. Local configuration contains the
  customer HTTPS certificate pair, MSG91 widget ID, server auth key, and an
  allowed CORS origin for `https://material-square.localtest.me:5175` (values
  were checked without printing secrets). The customer site remains blocked
  from manual inspection by Codex's saved browser-access preference, so this
  does not prove a fresh CAPTCHA/OTP or page-level behavior.
- Re-audited supplier privacy: `GET /suppliers` and its detail/mutation routes
  are protected by `StaffGuard`; the public catalogue reads only published
  catalogue listings and variants and does not join supplier records. Supplier
  privacy is supported by the current route/query structure; authenticated
  customer/admin browser checks remain outstanding.
- Re-audited catalogue search: the storefront loads the public catalogue from
  the database-backed `/products` route. Marketplace results and autocomplete
  share `matchesCatalogueSearch`, which includes entered listing fields,
  specification keys/values, variant labels/codes/units, and variant attribute
  keys/values. This supports the document's product-and-attribute search rule
  in code; live customer search remains part of the browser-blocked checks.
- Checked the public app and API source for payment-provider or checkout
  integrations. The application has no online payment flow; order payment is
  an internal staff record for cash, UPI, or another method after receipt, as
  required. No online payment was initiated or recorded during this audit.
- Tightened `scripts/dev-all.cjs` shutdown to signal each child process group
  on POSIX, preventing nested npm-launched API/Vite processes from remaining as
  stale watchers after an interrupted or failed launch. Syntax and whitespace
  checks pass. The second-launch guard was rechecked against the running stack
  and refused to start a duplicate; the four expected listeners remain active.
- Closed a documented quotation-reminder workflow gap in code: staff can
  reschedule a pending reminder, which cancels the old row and creates an
  audited replacement so the old queued job sees a cancelled follow-up; a
  staff member can also mark an internal reminder complete. External
  WhatsApp/email reminders create a replacement outbox job at the new time.
  Focused API coverage passes 8/8, and admin/API builds pass. The UI workflow
  still needs a manual localhost check after the saved browser-access
  preference is cleared; no notification was sent during this implementation.
- Added RFQ ownership and private staff notes for the admin inbox. Active staff
  owners are selected from a sales-authorized endpoint; updates create audit
  entries without putting internal note text in audit metadata. The customer
  activity endpoint uses an explicit field projection, and an isolated
  PostgreSQL integration check confirms owner/note fields appear in staff RFQ
  review but not in the customer response. Added the nullable columns and
  owner relation through `202610080008_rfq_assignment_and_staff_notes`, applied
  it to the local app and test databases, and backed up the test database to
  `/private/tmp/material-square-test-before-rfq-workflow.dump` before
  migrating. Full API suite: **30 suites, 274 tests, 0 skipped**; admin/API
  builds pass. The actual signed-in admin controls still need a browser check.
- Tightened the managed office/map behavior: the Contact page uses the saved
  office/depot name, the map shows configured service routes only when an office
  address exists, and its fallback Google Maps search uses that configured
  address instead of a built-in destination. `npm run build:web` passes; live
  Home/Contact verification remains blocked by the saved browser-access
  preference.
- Fresh verification on 8 October: the isolated PostgreSQL API integration
  suite passes 19/19, and `npm test` with `TEST_DATABASE_URL` passes all
  31 suites and 276 tests with zero skipped. `npm run build:web`,
  `npm run build:admin`, and `npm run build:api` pass. The API readiness check
  returns HTTP 200 and ports 4000, 5173, 5174, and 5175 are listening. The web
  build warns that `VITE_PUBLIC_SITE_URL` is unset. Codex still blocks live
  customer/admin page inspection, so visual and provider-dependent checks
  remain outstanding.
- Requirements reconciliation: the customer quotation screen and API no longer
  support “Request changes,” which was customer-facing negotiation despite the
  explicit exclusion in `docs/product/requirements.md`. Customers can still
  inspect the full staff-issued quote, choose an included comparison option,
  accept it to create an order, or decline it. Staff retain quote preparation
  and revision controls. The schema unit test and authenticated PostgreSQL
  integration request both verify the API rejects the removed decision. Full
  API verification after the change passes 30 suites and 273 tests with no
  skips, and storefront/admin/API builds pass. The updated Playwright file
  lists two response cases and asserts the negotiation action is absent; those
  browser cases have not run because localhost access remains blocked. Live UI
  inspection of this correction remains pending browser access.
- Added an authenticated database integration assertion for customer account
  quotation visibility: a published quotation appears in customer activity,
  while its staff-only pending revision is excluded. This supports the
  requirements that customers see only their own published quotations and
  compare only the options the staff included in those quotes. The full API
  suite still passes 30 suites and 273 tests with no skips.
- Read-only inventory snapshot of the local application database: 129 active
  catalogue drafts and zero published listings. No active listing has a price,
  offer, or image; one explicitly named QA-only draft has synthetic stock/MOQ
  data and remains unpublished. All supplier records are soft-deleted, one
  QA order remains `PROCESSING_AT_YARD` and `UNPAID`, and none is marked
  delivered. Three RFQs remain `NEW` and one `QUOTED`; these are not public
  catalogue content. The production catalogue therefore still requires
  client-approved products, prices, stock, offers, MOQs, and photos before
  launch.
- Added an isolated PostgreSQL regression for supplier privacy: it associates
  an active supplier record, private phone, available quantity, and buy price
  with a published catalogue variant, then confirms the public `/api/products`
  response contains the client listing but none of those supplier fields. The
  synthetic fixture is cleaned after the assertion. Full API suite passes all
  30 suites and 273 tests with zero skips.
- Centralized the RFQ upload caps in the shared types package so the customer
  file picker and API interceptor use the same limits: 10 files and 100 MiB
  per file. Unit tests cover the exact accepted boundary and one-over-limit
  cases. Authenticated PostgreSQL integration checks submit 11 synthetic PDFs
  and a sparse file one byte over the 100 MiB limit; the API rejects them with
  HTTP 400 and 413 respectively. The full API suite passes 31 suites and 276
  tests with no skips. Storefront, admin, and API builds pass. No 100 MiB file
  was uploaded; acceptance at that exact size is validated by the shared
  validator and the Multer per-file configuration.
