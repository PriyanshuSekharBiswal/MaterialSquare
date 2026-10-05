# Product requirements

This document records the client's current website scope. The public catalogue
must reflect the client's inventory and approved product data. Browsing and
quote-list creation remain available without sign-in; customers can sign in by
verified mobile number to review their own account history. Client admins and
staff use a separate role-protected operations workspace.

## Customer website

| Area             | Behavior                                                                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue        | Show client-published products and variants with their brand, type/category, attributes such as colour or size, unit/pack, price, availability, minimum order quantity, and approved offers.                                  |
| Search           | Search and autocomplete across the products and attributes the client has entered. Search results must come from the client catalogue.                                                                                        |
| Product detail   | Show the selected product's approved description, variants, price, stock status, minimum order quantity, and client-supplied images where available.                                                                          |
| Quote list       | Let visitors add products and quantities to a list stored in their browser. No sign-in is needed to browse or prepare the list.                                                                                               |
| Quote request    | Collect project and delivery details, then require verified mobile OTP before saving the request to the customer's account and the staff RFQ queue. Store a canonical snapshot of published catalogue items where applicable. |
| Enquiry handoff  | General enquiries can prepare a WhatsApp or email message. The site does not claim that an external message was sent or delivered.                                                                                            |
| Customer account | Optional MSG91 phone/OTP sign-in for customers to see their own requests, published quotations, brand/price options included in quotations, orders, delivery progress, purchase history, loyalty activity, and profile.       |
| Information      | Provide the public business pages, contact details, and approved policies/content.                                                                                                                                            |
| Service area map | Keep the animated route map on Home and Contact. Office name, address, service area, and contact actions must use client-managed website content; map destinations stay unavailable until an office address is configured.    |
| Admin workspace  | Provide protected sign-in for client admins and staff, role-based operations, catalogue editing, staff provisioning, and business management.                                                                                 |

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

## Explicit exclusions

- No checkout, payment gateway, payment collection, or payment status tracking.
- Customer-facing quotation negotiation and payment collection remain out of
  scope. Customers can review their submitted requests and staff-prepared quotes
  after phone verification; quote preparation and approval stay with staff.
- No demo mode or generated product photos. Starter catalogue records are
  editable and carry no invented prices, stock, offers, MOQs, or photos.

## Release checks

- Confirm production search and autocomplete use the database catalogue.
- Confirm brand/category/attribute filters, availability, price, offer, and
  minimum-order details reflect saved client records.
- Confirm product detail pages and quote-list quantities work on desktop and
  mobile.
- Confirm WhatsApp and email summaries open with the expected product and
  quantity details.
- Confirm customer phone verification, account ownership, profile updates,
  quotation comparisons, order details, and delivery tracking work end-to-end.
- Confirm the service map remains visible on Home and Contact and does not show
  unconfigured office, service-area, or contact details.
- Approve the business content, policies, catalogue, and client-provided imagery
  before launch.
