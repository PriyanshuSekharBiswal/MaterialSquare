# Implementation status

Status as of 5 October 2026: the initial client release is in progress. The
repository has not been released to production. Product behavior and scope are defined in
[Product Requirements](../product/requirements.md); architecture and maintenance
conventions are in [Code Structure](code-structure.md).

## Implemented and verified

- Public customers can browse the client-owned product catalogue without signing
  in. The existing customer sign-in flow remains required for saved materials and
  quotation actions.
- Staff can manage catalogue products, variants, prices, availability, optional
  offers, and product photos. One primary image is required; up to four additional
  images are optional.
- The customer and staff quotation flows include multi-material quotations,
  saved drafts, publication, PDFs, revisions, brand alternatives, acceptance,
  decline, and order creation. Sales staff can record acceptances received by
  WhatsApp, email, or phone; the recorded channel, order creation, and internal
  procurement request share one transaction and are attributed in the audit log.
- Customer accounts show requests, quotations, orders, delivery progress, and
  loyalty activity.
- The order lifecycle now uses only order-processing and delivery states.
  Legacy payment-related order states are migrated to processing, payment and
  commission-payout fields are removed from the database model, and customer/API
  order responses do not include payment records.
- Staff can manage suppliers and their product coverage for internal purchasing.
  Supplier matching prioritizes exact delivery-PIN coverage, then suppliers in
  the delivery city, and then supplier rating. Supplier quotes capture offered
  quantities and prices per material;
  purchase orders can allocate quantities across suppliers without exceeding the
  requested amounts. Quotes are locked after a purchase order is created.
- Dispatch staff can record partial receipts by material. Customers can see
  delivered and remaining quantities.
- Staff can edit and publish supported website content, policies, FAQs, navigation,
  experts, and blogs. New image uploads are searchable in the media library, which
  now reports references from products, blogs, expert profiles, and saved website
  content. Website content drafts can be saved and previewed in the customer-site
  layout through a private origin-checked iframe handshake; preview does not publish
  content or record analytics events. Staff can upload and publish an optional
  homepage hero image through the website content editor, control homepage section
  visibility/order, add, duplicate, reorder, hide, and delete up to ten plain-text
  content blocks with optional internal links, update hero and callout button
  labels and internal links, and manage up to eight HTTPS social links in the footer. The CMS also manages
  Tools & Guides tab labels, headings, introductions, ordering, visibility, and
  closing callout; technical guidance details and professional verification
  notices remain in the reviewed page template.
- Staff roles and API access checks are in place. Audit and notification review
  screens are available. Transactional audit events cover catalogue/SKU changes,
  quotations, orders and purchase orders, delivery changes, website drafts and
  publishing, staff enquiry creation/updates, customer quotation acceptance and
  decline, media uploads, supplier maintenance
  and quotes, procurement requests, RFQ status changes, blog and expert content,
  commission creation/approval, loyalty policy/point adjustments, and staff
  account/access changes and password resets. The action-by-action review of
  staff write routes is complete; each business mutation writes its audit record
  inside the same transaction. The role contract exercises 91 staff operations
  across all eight roles.
- Commission approval uses a conditional state claim, so concurrent reviewers
  cannot both approve the same pending record or write duplicate approval audit
  events. The record-entry rate remains manually set until the client confirms
  its commission eligibility policy.
- The commission list returns only the six fields shown by its review screen;
  related customer and order records are not fetched for that view.
- Staff can configure the quotation validity period and independently enable
  publication and expiry notifications. Existing 48-hour validity and 24-hour
  reminder defaults are preserved; configuration changes are audited.
- Staff can review date-filtered sales/quotation, procurement, and fulfillment
  reports. API permissions match the responsible staff roles, and CSV exports
  contain only authorized report rows with spreadsheet-formula escaping. Each
  report is capped at 500 displayed/exported records and indicates truncation.

All supplier and procurement screens are staff-only buy-side tools. The client
remains the sole seller in the public catalogue; suppliers have no public
storefronts or seller accounts.

## Verification completed

- The staff login and workspace layout were separated from the admin app
  composition root into `features/auth/StaffLogin.tsx` and
  `components/AdminWorkspaceLayout.tsx`. The admin production build and focused
  login browser test passed after the move. Loyalty settings reads now return
  schema defaults without creating database records; the focused regression
  test and API typecheck passed.
- Focused commission and staff-permission tests pass after adding the
  concurrency-safe approval claim and its audit behavior checks.
- The staff role/action contract covers 91 HTTP operations across all eight
  roles; API route checks fail closed when a staff-protected action has no
  permission mapping.
- All 241 API tests passed against an isolated fresh PostgreSQL database with all
  30 migrations applied. Database-backed coverage includes customer/staff
  boundaries, RFQ persistence and audited status changes, staff enquiry and
  website draft audits, customer quotation acceptance and decline, blog publication
  and archival, expert publication audit
  history, quotation PDFs, demo roles, and persisted-role HTTP access for audit,
  procurement, quotations, catalogue, media, dispatch, commissions,
  website-content, and sales-report routes. The persisted-login matrix exercises
  all eight staff roles against these nine business areas.
  The migration seeded the centralized quotation rules with the preserved
  48-hour validity and 24-hour reminder defaults. The isolated run was repeated
  after extracting commission persistence into `CommissionsService` and adding
  transactional staff-enquiry and website-draft audit records. It includes
  portal and staff-recorded quotation acceptance, order/procurement creation,
  commission calculation, audit privacy, and approval guard tests. Earlier SQL
  assertions verified legacy-state conversion, payment-field removal, and
  payment-language cleanup. The disposable cluster was stopped and removed after
  the run.
- All four isolated demo browser tests pass against a disposable migrated
  database. They verify that demo mode does not display or generate a customer
  OTP; staff sign in and load the PostgreSQL-backed workspace; a published
  catalogue product and its price appear on the guest storefront; and staff can
  create and publish a quotation, record acceptance received by phone, create an
  order and procurement request, match a supplier, create a purchase order, and
  progress a delivery through the allowed states before recording a partial
  receipt. A database-backed customer session then shows that order and its
  partial-delivery progress in My Account, reviews a second published quotation,
  selects the Ambuja brand alternative, and accepts it; the resulting order
  retains the selected brand. The browser flow also checks the saved order and
  procurement records.
- Two focused procurement browser tests passed for item-level supplier quote entry
  and purchase-order review; the supplier-match browser flow also verifies the
  same-city priority label. API tests verify exact-PIN/city/rating ordering.
  Focused media-reference and partial-delivery browser checks also passed.
  Customer-site draft preview and homepage hero upload/publish browser checks
  passed. The focused website-editor-to-customer-site test also verifies CTA
  labels and internal links, two-way homepage ordering, footer social links, and
  the add/duplicate/reorder/hide/delete flow for custom homepage text sections.
  The published section and its internal button appear on the customer site;
  website-content API tests reject excessive blocks, duplicate IDs, incomplete
  buttons and external URLs.
- Workspace typechecking, Prisma schema validation, API/admin/customer-site
  production builds, and `git diff --check` passed.
- All 54 customer-site/admin browser acceptance tests pass against local
  storefront and admin servers. The tests mock API responses; they verify the
  named browser interactions but do not replace database-backed integration or
  production-provider acceptance. Mobile marketplace checks also verify that
  floating quick actions do not cover product-card controls.
- Admin acceptance includes the aggregate overview and a customer account detail
  to manually recorded follow-up flow, including the submitted request payload.
- Procurement and dispatch acceptance includes internal purchase-request
  creation, delivery-plan setup, and delivery-challan submission.
- Focused API tests cover report ranges/values, role permissions, and the
  transactional catalogue, RFQ, blog, expert, and staff audit records, including
  checks that product descriptions, article copy, expert contact details, and
  passwords never enter audit metadata. A role/action contract checks 91 staff
  operations against all eight roles, with database-backed access checks
  through staff login and the API guard for nine business-area routes.
- Server-rendered article share metadata, route-specific crawler HTML, the
  published-article sitemap API, and preview-safe robots rules are implemented;
  crawler handler typechecking and sitemap API tests pass.
- A staff browser test covers updating quotation validity and notification
  settings. The temporary database was stopped and removed after testing. No
  supplier communications or production deployment were performed.

These checks cover the named workflows, not the entire product or its live
production integrations.

## Remaining release work

- Run and verify the dry-run/apply media index backfill against the client's
  configured bucket. Safe unused-asset removal is still unavailable; tracked
  references are shown in the staff library. Configure the customer and staff origins required by draft
  preview in production and verify the handshake on the deployed domains.
- Confirm commission eligibility policy and fuller reporting needs with the
  client. Also approve the discount, quotation/follow-up, supplier-rating,
  loyalty, transportation, and notification settings listed in the
  [production checklist](../operations/production-readiness.md#6-business-rules-to-approve).
- Verify the live customer SMS provider and production sign-in on the configured
  customer domain. The isolated browser flow seeds a valid test customer session
  so portal screens can be verified without relying on a real SMS provider;
  separate PostgreSQL tests cover session creation, expiry, account isolation,
  logout revocation and quotation acceptance.
- Verify hosting, database migration, object storage, notification providers,
  backups and restore, client content, and acceptance in the production environment.

## Business constraints

- Do not add payment collection, a payment gateway, checkout, paid/unpaid controls,
  payment-status management, payment reporting, or commission payouts. The client
  handles payments and their status outside this application.
- Preserve public browsing and the current customer sign-in behavior for saved
  materials and quotation actions.
- Keep the public catalogue owned and managed by the client. Supplier data is
  internal procurement data only.
