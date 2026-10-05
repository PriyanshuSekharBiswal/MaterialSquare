# Product requirements

This document defines the baseline scope for the client's initial deployment. It
does not claim every feature is finished or deployed. Post-launch enhancements can
be added as the client's needs evolve. Implementation evidence and outstanding
release work are tracked in
[Implementation Status](../engineering/implementation-status.md). Developers
should also read [Code Structure](../engineering/code-structure.md).

The baseline is derived from the owner-provided _Business Management System
Requirements Summary_ and subsequent owner clarifications. The client's own
catalogue is the sole public storefront; supplier workflows are internal
procurement only. Website payments and payment-status management are excluded.

## Customer website

| Area                    | Initial release behavior                                                                                                                                                                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public catalogue        | Guests browse/search/filter products, brands and pack sizes; review product details, indicative prices, offers and availability.                                                                                                                                                                                        |
| Login and material list | Preserve the existing customer login. Login is required for adding materials to the list/cart and requesting quotations. Ordinary browsing remains public.                                                                                                                                                              |
| Requests                | Customers submit requirements and review their request history. Staff receive the requests in the admin inbox.                                                                                                                                                                                                          |
| Quotations              | Customers review published quotations and PDFs, compare up to three brand options per material, choose options and accept or decline. Sales staff can record a customer's acceptance received by WhatsApp, email, or phone; accepted quotations create one order and procurement request. Drafts stay private to staff. |
| Orders                  | Customers review accepted-order materials, delivery progress and loyalty activity.                                                                                                                                                                                                                                      |
| Information             | Public blogs, experts/services, FAQs, contact details, privacy policy and website terms.                                                                                                                                                                                                                                |

## Admin and backend

| Area               | Initial release behavior                                                                                                                                                                                                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer support   | Customer records, request inbox, enquiry status and quotation reminders.                                                                                                                                                                                                                        |
| Catalogue          | Product/pack details, images, prices, quantity discounts, offers, availability and publication.                                                                                                                                                                                                 |
| Sales              | Multi-material quotations, up to three brand options per material, pricing/margins, saved drafts, publication, PDFs and linked revisions.                                                                                                                                                       |
| Procurement        | Supplier records and coverage, matching prioritized by delivery PIN and city, supplier quotation comparison, item allocation, purchase-order creation/revision/approval and sending.                                                                                                            |
| Delivery           | Transportation plans, dispatch challans, status progression and per-material partial fulfilment receipts visible to customers.                                                                                                                                                                  |
| Business rules     | Discount and loyalty settings, commission calculations/approvals, and central quotation/notification rules.                                                                                                                                                                                     |
| Website management | Content drafts and publication, page metadata, homepage section visibility/order, up to ten repeatable text sections with optional internal links, editable CTA labels and internal paths, navigation, FAQs, policies, editable Tools & Guides sections, blogs, experts, configurable footer social links, an optional homepage hero image and media management. |
| Administration     | Staff accounts/roles, permissions, activity/reports, audit review and notification status.                                                                                                                                                                                                      |

## Selling model and internal procurement

The client is the only seller on the public website. Public catalogue products,
prices, offers and availability are controlled by the client's staff. Supplier
records, supplier product coverage, price quotes, ratings and purchase orders are
internal buy-side tools used to source materials for the client's confirmed
orders. Suppliers do not get customer-facing storefronts, seller accounts or
the ability to publish products to the website.

## Explicit exclusions and preserved behavior

- No payment gateway, checkout, website payment collection, paid/unpaid controls,
  payment-status administration, payment reporting or commission payouts.
- The client handles money and payment status outside this application.
- Payment-status values and payment-record columns have been removed from the
  active application model; a migration maps legacy order states to processing.
- Guest browsing and the existing login/session mechanism remain unchanged.
- Prices, quotation/order totals, procurement costs, loyalty discounts and
  commission calculation/approval remain within the business scope.

## Release acceptance gates

The implementation status is the current record of verified behavior and open
release gates. The remaining work requires the client's production accounts,
business policies, approved content and acceptance. It includes:

- Configure the production customer/admin/API origins, commercial hosting,
  persistent database, object storage, notifications, OTP, backups and restore
  monitoring. Run the media index dry run and apply against the approved bucket.
- Verify customer SMS sign-in, draft preview, crawler metadata and media behavior
  on the configured production domains and providers.
- Approve and configure the discount, quotation/follow-up, supplier-rating,
  commission, loyalty, transportation and notification rules listed in the
  [production checklist](../operations/production-readiness.md#6-business-rules-to-approve).
- Confirm commission eligibility and fuller reporting requirements.
- Approve the customer policies, business identity/contact details, catalogue,
  prices, product imagery and public claims; complete client acceptance checks.

Automated checks prove only their covered behavior. No production deployment or
client approval is claimed here.

## Post-launch enhancements

This requirements document is the initial-release baseline, not a limit on future
development. Record and prioritize new client needs after deployment, then update
this document and the implementation status when the client agrees to the scope.
