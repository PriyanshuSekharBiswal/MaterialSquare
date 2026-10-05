# Product requirements

This document records the client's current public website scope. The public
catalogue must reflect the client's inventory and approved product data.
Payments and customer accounts are not part of this release. Client admins and
staff need a protected operations workspace.

## Customer website

| Area | Behavior |
| --- | --- |
| Catalogue | Show client-published products and variants with their brand, type/category, attributes such as colour or size, unit/pack, price, availability, minimum order quantity, and approved offers. |
| Search | Search and autocomplete across the products and attributes the client has entered. Search results must come from the client catalogue. |
| Product detail | Show the selected product's approved description, variants, price, stock status, minimum order quantity, and client-supplied images where available. |
| Quote list | Let visitors add products and quantities to a list stored in their browser. No sign-in is needed. |
| Request handoff | Show a request summary and prepare a WhatsApp or email handoff. The site does not claim that an external message was sent or delivered. |
| Information | Provide the public business pages, contact details, and approved policies/content. |
| Service area map | Keep the animated route map on Home and Contact. Office name, address, service area, and contact actions must use client-managed website content; map destinations stay unavailable until an office address is configured. |
| Admin workspace | Provide protected sign-in for client admins and staff, role-based operations, catalogue editing, staff provisioning, and business management. |

## Inventory and operations

The client adds and updates product, variant, offer, availability, price,
minimum-order, staff, and other approved records through the admin workspace.
The storefront only displays records published in the client catalogue. Product
photos and other client-specific assets come from the client.

## Explicit exclusions

- No customer sign-in, customer account profile, or account portal.
- No checkout, payment gateway, payment collection, or payment status tracking.
- No in-app quote inbox, negotiation, order portal, or fulfilment portal. Those
  conversations and processes are handled by the client's chosen channels.
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
- Confirm the service map remains visible on Home and Contact and does not show
  unconfigured office, service-area, or contact details.
- Approve the business content, policies, catalogue, and client-provided imagery
  before launch.
