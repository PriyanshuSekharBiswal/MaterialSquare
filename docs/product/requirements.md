# Product requirements

This document records the client's current website scope. The public catalogue
must reflect the client's inventory and approved product data. Browsing and
quote-list creation remain available without sign-in; customers sign in with
their mobile number and a verified OTP to review their own account history.
Client admins and staff use a separate role-protected workspace and sign in
with a mobile number or email plus password.

## Customer website

| Area             | Behavior                                                                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue        | Show client-published products and variants with their brand, type/category, attributes such as colour or size, unit/pack, price, availability, minimum order quantity, and approved offers.                                  |
| Search           | Search and autocomplete across the products and attributes the client has entered. Search results must come from the client catalogue.                                                                                        |
| Product detail   | Show the selected product's approved description, variants, price, stock status, minimum order quantity, and client-supplied images where available.                                                                          |
| Quote list       | Let visitors add products and quantities to a list stored in their browser. No sign-in is needed to browse or prepare the list.                                                                                               |
| Quote request    | Collect project and delivery details, then require a signed-in customer before saving the request to the customer's account and the staff RFQ queue. Store a canonical snapshot of published catalogue items where applicable. |
| Enquiry handoff  | General enquiries can prepare a WhatsApp or email message. The site does not claim that an external message was sent or delivered.                                                                                            |
| Customer account | Mobile number plus verified OTP sign-in for customers to see their own requests, published quotations, brand/price options included in quotations, orders, delivery progress, purchase history, loyalty activity, and profile. Customers may accept or decline a published quotation and choose supported alternatives. The revocable HTTP-only session expires after 90 days without activity and renews while used. Its token rotates every 14 days; the previous token remains valid for 15 minutes to cover concurrent requests. Another browser/device requires OTP sign-in. |
| Information      | Provide the public business pages, contact details, and approved policies/content.                                                                                                                                            |
| Service area map | Keep the animated route map on Home and Contact. Office name, address, service area, and contact actions must use client-managed website content; map destinations stay unavailable until an office address is configured.    |
| Admin workspace  | Provide protected sign-in for client admins and staff, role-based operations, catalogue editing, staff provisioning, and business management.                                                                                 |

Customer sessions persist in the current browser for up to 90 days without
activity and renew as the customer uses the account. Signing in on another
browser requires a new OTP.
Explicit sign-out revokes the current browser session.

## Inventory and operations

The client is the only seller. Partner brands identify the client's sourcing
relationships; suppliers and procurement are internal operations and cannot
publish storefront listings. The client adds and updates product, variant,
offer, availability, price, minimum-order, staff, and other approved records
through the admin workspace. Customers can see only account data linked to
their verified phone account; comparison choices only come from a published
client quotation.
The storefront only displays records published in the client catalogue. Product
photos and other client-specific assets come from the client.

Supplier sourcing is a staff-only inventory workflow. Staff can register supplier
business/contact details, location and service PINs, then associate each supplier
with the products, brands, categories, units and packs they can provide. The
supplier directory must support product and category search and show supplier
location/service coverage so staff can find likely sources quickly. Supplier
availability includes an available quantity and when it was last checked; it is
an internal sourcing indication until staff confirms a current supplier quote.

When a customer or order requires more than the client's available stock, staff
must be able to see the shortfall and find matching suppliers for that product,
brand, unit and quantity. Supplier candidates are ranked by delivery PIN and
service coverage, then city and recorded supplier rating. A shortfall may be
allocated across multiple suppliers; each supplier's offered quantity, price,
lead time and quote validity are recorded for comparison before a purchase order
is approved. Supplier identities, contact information, supplier stock and buy
prices remain visible only to authorized staff and never appear in customer
catalogue search, product pages or quotations. The client remains the sole seller
to customers.

## Explicit exclusions

- No checkout, payment gateway, or online payment collection.
- Client staff record each received cash, UPI, card, or other offline payment,
  including advances and balance settlements. Records are for internal order
  tracking and audit only; the website must never initiate, collect, or verify a
  payment.
- Customers cannot edit quotation prices, margins, taxes, or contents. Quote
  preparation and approval remain staff responsibilities. Payment collection
  remains out of scope.
- No demo mode or generated product photos. Starter catalogue records are
  editable and carry no invented prices, stock, offers, MOQs, or photos.

## Release checks

- Confirm production search and autocomplete use the database catalogue.
- Confirm brand/category/attribute filters, availability, price, offer, and
  minimum-order details reflect saved client records.
- Confirm product detail pages and quote-list quantities work on desktop and
  mobile.
- Confirm accept and decline responses are authenticated,
  idempotent and visible in the staff workflow; only acceptance creates an order.
- Confirm WhatsApp and email summaries open with the expected product and
  quantity details.
- Confirm mobile OTP sign-in, browser session persistence/logout, account
  ownership, profile updates,
  quotation comparisons, order details, and delivery tracking work end-to-end.
- Confirm customer session rotation after 14 days, the 15-minute overlap for
  concurrent requests using the previous token, and revocation on sign-out.
- Confirm the service map remains visible on Home and Contact and does not show
  unconfigured office, service-area, or contact details.
- Approve the business content, policies, catalogue, and client-provided imagery
  before launch.
