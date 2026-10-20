# Production readiness

The client should provide and approve the following before the public site goes
live. Never send passwords, provider keys, or database URLs in chat or email.

## Business and website content

- Legal business name, public trading name, contact phone/WhatsApp, email,
  address, service cities, and support hours.
- Approved home page, brand-partnership claims, product descriptions, shipping
  wording, contact details, and policy text.
- Client-approved privacy notice and website terms that describe the browser
  quote list and WhatsApp/email handoff accurately. The legal pages remain
  unpublished in the admin workspace until the approved text is ready.
- Confirm the cookie and browser-storage inventory (including MSG91 widget
  behavior), whether consent controls are required for target jurisdictions,
  retention/deletion procedures, privacy-request handling, the legal operator
  and grievance contact. Obtain qualified legal review before publishing and
  update the notice when authentication or messaging providers change.

## Catalogue records

Historical migrations add manufacturer/reference product families and legacy
starter records for staff review. Cleanup migrations keep unapproved entries
unpublished and remove reference prices, stock, offers, minimums, and images
while retaining editable drafts. These rows are not client inventory. Before
client launch, verify the public products endpoint contains only the client's
approved inventory. Add client-approved products in the admin workspace and
provide:

- Product name/code, exact brand spelling, category and type.
- Colour/finish, size/specifications, pack or selling unit, and quantity options.
- Price, tax wording, stock/availability, minimum order quantity, quantity
  breaks, and approved offers with start/end dates.
- Product description and a client-supplied image with permission to use it.

Confirm who will maintain stock, pricing, product visibility, and offer dates.
Unavailable products can remain visible with their availability status.

## Staff records and operations

Provision one initial client administrator after local testing with a unique
password of at least 12 characters. The client then creates and manages staff
accounts in the protected admin workspace. Delete
temporary developer test accounts before handover and create the client's real
administrator account. Run `scripts/create-production-staff.sh` with
`PRODUCTION_DATABASE_URL` set to the client's production database connection
string in a secure operator shell. The script prompts for the administrator's
name, phone, optional email, and password without storing those values in the
repository. Configure and verify MSG91 for customer OTP sign-in before enabling
that account entry point in production.

## Hosting and data

- Customer website domain and DNS.
- Admin workspace domain or `/admin/` route and DNS/access configuration.
- Commercial-permitted website hosting and persistent API/PostgreSQL hosting.
- S3-compatible product-image storage and public read-only/CDN URL.
- Private database/API configuration, an independent encrypted backup
  destination, retention period, and restore owner.
- Unique `JWT_SECRET`, MSG91 auth key, storage credentials, and (if enabled) a
  32-byte-or-longer notification webhook token stored in the hosting secret
  manager. Never use `VITE_*` variables for private credentials.
- Exact customer and admin origins for API CORS and `VITE_PUBLIC_SITE_URL` for
  canonical/search-engine metadata.
- Monitoring contact and budget approval.

## Release checks

- After the website scope and client-approved content are complete, repeat the
  full SEO/AEO/GEO review on the approved canonical domain. Check rendered page
  titles and descriptions, canonical and robots directives, sitemap coverage,
  structured data against visible page content, internal links, mobile
  performance, and public business details/service areas. Once the domain is
  live, verify it in Google Search Console, inspect representative URLs, and
  submit the sitemap.
- `/api/health/ready` returns healthy on the production domain.
- Admin and staff sign-in, role permissions, and staff provisioning work. New,
  reset, and changed staff passwords require at least 12 characters. Verify
  that the reverse-proxy hop count and exact CORS origin allowlist match the
  deployed topology.
- Customers can browse without signing in. Mobile OTP sign-in gates quotation
  requests and account history, and the session expires after 90 days without
  activity or when the customer logs out. Admin/staff use mobile/email and password. Verify account ownership, quotation revisions,
  multiple line items, order history, and profile updates.
- Accepting a quotation creates the order and any required procurement request.
  Declining creates no order. Replaying or submitting a stale response has no
  duplicate effect.
  Staff can match suppliers using product coverage and service-area/location
  data, compare supplier quotes, approve purchase orders, and track partial or
  complete receipts.
- Payments are recorded manually by staff after offline cash/UPI/card receipt,
  including advances and balance settlements; there is no customer payment
  gateway. Notification delivery remains deferred until a provider is selected.
  Staff-entered vehicle and delivery updates appear in the customer's order
  tracking view.
- New quotation, order, procurement, purchase-order, dispatch, and delivery
  references retain the agreed 23-character compact format (excluding
  hyphens) and remain unique when generated concurrently.
- Search suggestions, filters, and product pages show only approved client
  catalogue data.
- Privacy and terms pages show only client-approved, explicitly published copy.
- Brand, type, colour/finish, pack, price, availability, minimum order, and
  offer details match saved database records.
- The browser-local quote list preserves selected products and quantities.
- WhatsApp and email handoffs open with a correct, reviewable request summary.
- Backups and an isolated restore have been verified.
- Apply database migrations after a backup and before the API release. The
  current release adds shared API rate-limit buckets, idle-expiry tracking,
  and a brief overlap on token rotation. Existing unexpired sessions may
  remain valid for up to 90 days after migration because their prior activity
  cannot be reconstructed; verify every pending migration record before
  starting the new API. Staff will need to sign in again after the JWT
  issuer/audience change.

Notification delivery is deferred until the client provisions and approves a
provider. Do not treat SMS, email, or webhook delivery as a launch acceptance
criterion while that work is deferred; confirm notification state is visible
to staff where applicable.
