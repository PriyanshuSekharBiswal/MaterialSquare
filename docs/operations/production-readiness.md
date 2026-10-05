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

## Catalogue records

The repository does not seed sample products. The pending catalogue cleanup
migration hides known legacy starter listings while preserving them for staff
review. Before client launch, verify the public products endpoint contains only
the client's approved inventory. Add the client-approved initial products in
the admin workspace and provide:

- Product name/code, exact brand spelling, category and type.
- Colour/finish, size/specifications, pack or selling unit, and quantity options.
- Price, tax wording, stock/availability, minimum order quantity, quantity
  breaks, and approved offers with start/end dates.
- Product description and a client-supplied image with permission to use it.

Confirm who will maintain stock, pricing, product visibility, and offer dates.
Unavailable products can remain visible with their availability status.

## Staff records and operations

Provision one initial client administrator after local testing. The client then
creates and manages staff accounts in the protected admin workspace. Delete
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
- Exact customer and admin origins for API CORS and `VITE_PUBLIC_SITE_URL` for
  canonical/search-engine metadata.
- Monitoring contact and budget approval.

## Release checks

- `/api/health/ready` returns healthy on the production domain.
- Admin and staff sign-in, role permissions, and staff provisioning work.
- Customer OTP verification is action-gated for quotation submission and
  account history; ownership boundaries, RFQ visibility, quotation views,
  brand comparisons, order tracking, loyalty, and profile updates work.
- Search suggestions, filters, and product pages show only approved client
  catalogue data.
- Privacy and terms pages show only client-approved, explicitly published copy.
- Brand, type, colour/finish, pack, price, availability, minimum order, and
  offer details match saved database records.
- The browser-local quote list preserves selected products and quantities.
- WhatsApp and email handoffs open with a correct, reviewable request summary.
- Backups and an isolated restore have been verified.
