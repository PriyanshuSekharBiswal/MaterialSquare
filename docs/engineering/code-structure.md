# Code structure

Keep the existing monorepo boundaries: `apps/web` owns customer screens,
`apps/admin` owns staff screens, `apps/api` owns business workflows,
`packages/types` owns shared input validation, and `packages/db` owns persisted
models and migrations.

## Naming and ownership conventions

Use the business capability as the directory boundary, not a delivery milestone
or release number. Keep the repository's standard workspace names (`apps/`,
`packages/`, `deployment/`, `docs/`, and `scripts/`) and place new code beside
the existing capability it extends. Do not add folders or files named `v1`,
`initial-version`, `temporary`, or similar; releases are tracked in project
metadata and release notes, while source paths describe what the code does.

Use PascalCase for React components and screens (`SupplierManagement.tsx`),
kebab-case for non-component TypeScript modules (`quotation-pricing.ts`,
`staff-access.ts`), and descriptive lowercase names for scripts and styles
(`backfill-media-library.cjs`, `business-console.css`). Name services and
controllers after the domain and responsibility they own. Keep a feature's
component, styles, API contracts, and focused helpers together when they have
one clear owner; put code in shared `components/` or `packages/types` only when
more than one feature consumes the same behavior or contract.

Prefer a small composition root (`App.tsx`, `AppModule`) that wires features
together. It should own application-level authentication, navigation, and
shared loading coordination; feature folders should own their workflow state,
validation and presentation. Split a file when it mixes distinct business
responsibilities or is difficult to review, rather than applying a fixed line
limit. Avoid duplicate copies during moves and remove the old path in the same
change. Update this guide when a new top-level capability or ownership rule is
introduced.

Organize each feature around its business responsibility. Controllers validate
inputs and delegate to named service actions. Services coordinate database reads,
state transitions and transactions. Extract calculations into focused typed
functions when they can run independently of persistence. Keep transaction
boundaries around changes that must succeed together.

For example, quotation controllers call `create`, `revise`, `editDraft`,
`publish` and `adjustMargin`. `quotation-pricing.ts` resolves product snapshots
and calculates discounts/totals. `QuotesService` persists drafts and enforces
publication and revision transitions. Client prices and units never override
server-owned product identity or calculation rules.

Quotation alternatives follow the same path: `QuoteEditor.tsx` captures a
maximum of three same-category/unit brand choices, `CreateQuoteSchema` validates
the request, and `quotation-pricing.ts` resolves snapshots and discounts.
`CustomerActivity.tsx` submits per-line choices; `CustomerController` validates
those choices and atomically applies the selected snapshots and totals before it
delegates conversion to `QuotationAcceptanceService`, which creates the order and
procurement request. Staff can use the same service to record an externally
received acceptance and its WhatsApp, email, or phone channel. `QuotationItemOption` retains the
comparison history, and `PdfService` displays the alternatives with a selection
note.

Frontend feature components own a coherent user task. Shared fields should be
extracted only when they have repeated behavior, such as approved image uploads.
Use explicit props and types rather than growing generic forms or untyped record
objects. Keep API calls and loading/error states clear to the screen that owns
them. Split large business screens by feature as their workflows are completed.

Prefer readable names, small functions and direct control flow. Avoid speculative
frameworks, repository layers that only forward Prisma calls, or new abstractions
without a concrete use. Refactor incrementally while preserving behavior, using
existing integration and browser checks appropriate to the affected workflows.

Name Playwright files `*.spec.ts` and group them by test purpose. The mocked
customer/admin acceptance suite lives in `tests/browser`; isolated PostgreSQL
browser flows live in `tests/demo`, split into account, catalogue, and business
workflow specs. Put repeated browser setup in a small named helper in the same
test folder rather than duplicating credentials and sign-in steps across specs.

Payments and payment status remain outside the application. Preserve guest
browsing and the existing sign-in requirement for material-list/quotation actions.

## Admin feature map

`apps/admin/src/App.tsx` owns shared session/API coordination and composes the
workspace screens. `features/auth/StaffLogin.tsx` owns the sign-in form, while
`components/AdminWorkspaceLayout.tsx` owns the responsive navigation, page
heading and shared workspace frame. Feature code lives under
`apps/admin/src/features`:

- `overview`: aggregate customer and website activity in `WorkspaceOverview.tsx`.
- `customers`: customer account details and manually recorded follow-ups in
  `CustomerFollowupWorkspace.tsx`, with screen data contracts in `contracts.ts`.
- `sales`: RFQ inbox, quotation editor, saved quotations and order screens.
- `procurement`: supplier comparison, purchase-order review and revision forms.
- `suppliers`: `SupplierManagement.tsx` owns supplier registration, service areas,
  activation and its local edit/detail state; `SupplierProducts.tsx` owns product
  coverage and rating controls.
- `catalogue`: customer-facing product, pack, price and offer maintenance.
- `content`: website draft/publish editor, media library, blog management, and
  expert directory panels. `HomepageSectionControls.tsx` orders and hides the
  built-in homepage sections; `HomepageContentBlocks.tsx` owns the bounded,
  repeatable plain-text sections and their internal-link controls.
- `staff`: staff account and role management.
- `reports`: date-filtered sales/quotation, procurement, and fulfillment reports with role-aware CSV exports.
- `commissions`: commission record entry and approval review.
- `loyalty`: customer rewards policy settings.
- `business`: section navigation and shared request state. Supplier, blog, expert,
  commission, loyalty, discount, quotation-rule, and follow-up panels are feature
  components. `PurchaseRequestForm.tsx` owns procurement intake fields and
  payload mapping; `TransportationPlanningForms.tsx` owns order delivery-plan
  and dispatch-challan forms.

Catalogue product photos use one required primary image and up to four optional
gallery images. The admin editor previews each image, caps uploads at five MB per
file, and the products API enforces the primary image and four-image gallery
limit. Product and variant offers are optional; compare-at prices and offer
labels/date windows can be left blank for regular-price items.

Shared reusable UI belongs in `components`; feature styles stay beside their
feature. `admin.css` and `workspace.css` remain application-wide styles. Import a
feature directly rather than adding re-export layers just to shorten imports.

Start a quotation change in `features/sales/QuoteEditor.tsx`, a procurement review
change in `features/procurement/ProcurementRequestCard.tsx`, or a PO revision change
in `features/procurement/PurchaseOrderRevision.tsx`. Corresponding API workflows
live under `apps/api/src/quotes` and `apps/api/src/business`. Prisma changes need a
new migration under `packages/db/prisma/migrations`.

Blog authoring and staff-only preview are in
`features/content/BlogManagementPanel.tsx`; provider directory editing is in
`features/content/ExpertDirectoryPanel.tsx`. Both panels own their form state and
receive typed submit/mutation callbacks from the business shell.

This map documents the current structure. The admin workspace root now composes
the overview and customer/follow-up feature screens; shared authentication,
navigation, and customer request data remain at that boundary. The business
console coordinates section navigation and shared API mutations; purchase
request and delivery-planning forms live in their owning feature folders, and
the console now uses `unknown` plus explicit section contracts instead of
untyped `any` records. Remaining backend controller groups and broad `any`
types elsewhere still need incremental tightening. The business shell delegates
supplier, blog, expert, commission, loyalty, discount, quotation-rule, and
reminder screens to feature modules; keep new workflow UI in its owning feature
and pass typed data and callbacks across the shell boundary.

## Business API map

`apps/api/src/business/business.module.ts` registers controllers; it does not
contain route implementations. Supplier operations are in `suppliers/`, matching
and quote entry in `procurement/`, purchase-order approval/sending/revisions in
`purchase-orders/`, and discount rules in `discounts/`. Public and staff content
controllers are separate files in `content/`. Current business input schemas are
in `business.schemas.ts`; the shared staff request identity type is in
`apps/api/src/auth/staff-request.ts`.
Supplier candidates are ordered by exact delivery-PIN coverage, matching city,
then the recorded average rating. The UI names each match tier rather than
claiming a geographic distance from PIN digits.

Follow-ups, transportation, commissions and loyalty now have their own feature
folders; the grouped workflows.controller.ts was removed. Moving
controllers does not itself separate all persistence from business logic; service
extraction should follow where transactional workflows justify it.

Loyalty administration lives in `business/loyalty/loyalty-management.controller.ts`;
customer point expiry is kept beside that feature in `business/loyalty/loyalty-expiry.ts`.
The customer controller calls this transaction helper when loading account activity.

`business/commissions/commissions.controller.ts` validates staff input and
delegates to `CommissionsService`. The service owns decimal calculation,
transactional approval and audit writes; no payout or payment-status action is
part of the commission workflow.

Central quotation timing and notification toggles live in
`business/settings/business-rules.ts` and
`business/settings/business-rules.controller.ts`. `BusinessRuleSetting` persists
the policy; `QuotesService` applies validity when a draft is saved and queues only
enabled customer notifications when staff publish it. The admin form is
`apps/admin/src/features/sales/QuotationRules.tsx`. The initial defaults preserve
the prior 48-hour quote validity and 24-hour expiry reminder timing.

Partial customer delivery receipts live in
`business/transportation/order-deliveries.service.ts`. The service validates
received quantities against saved `OrderItem` quantities, persists each trip in
`OrderDelivery`/`OrderDeliveryItem`, claims order and plan versions, and writes
staff audit records in the same transaction. The transport admin card and
customer activity screen show cumulative delivered quantities per material.

Operational reports live in `apps/api/src/reports`: the controller owns the
staff-only read routes, `ReportsService` performs date-bounded Prisma queries,
and report access is assigned through explicit report permissions in
`auth/staff-access.ts`. The admin screen is
`apps/admin/src/features/reports/OperationalReports.tsx`; it exports only the
rows the current staff role may view, escapes spreadsheet formulas in CSV cells,
and indicates when the 500-row display/export limit is reached. Sales totals are
recorded business document values and do not represent payment receipts.

## Website content API

`apps/api/src/site-content/site-content.controller.ts` handles reading drafts,
saving and publishing. `site-content.schema.ts` owns the allowed keys and input
validation for navigation, homepage ordering, metadata, FAQs and policies. Shared
defaults and the public content types live in `packages/types/src/site-content.ts`;
policy structures and defaults live in `packages/types/src/legal-content.ts`.
Change the shared content definition and its validation together when adding a field.
`features/content/GuideControls.tsx` edits the Tools & Guides tab labels, headings,
introductions, order and visibility through the same draft/publish model. The
technical guidance details and professional verification notice stay in the
reviewed customer-site template; tab ordering and visibility are shared typed
site-content settings validated by the API.
`HomepageSectionControls.tsx` manages visibility and order for the supported
homepage sections. Homepage CTA labels and internal paths are shared content
fields; the API rejects external CTA destinations. `SocialLinksEditor.tsx`
manages up to eight footer links and accepts only HTTPS destinations. Keep those
controls in the draft/publish flow instead of creating separate save paths.
The staff editor lives in `apps/admin/src/features/content/WebsiteContentManager.tsx`;
it saves a draft before opening the customer-site preview. The public content
provider and its origin-checked `postMessage` handshake live in
`apps/web/src/site-content.tsx`. Configure `VITE_CUSTOMER_APP_URL` in the admin
build and `VITE_ADMIN_APP_ORIGIN` in the customer-site build; the preview sends no
staff token to the customer site.

Customer-site crawl handlers are thin Vercel adapters in `apps/web/api`: published
article metadata is rendered server-side for link previews, `robots.ts` separates
production crawl rules from preview deployments, and `sitemap.ts` proxies the
published-page index generated by the public site-content API. Keep business data
selection in the API and deployment-specific HTTP behavior in these handlers.
`tsconfig.server.json` typechecks these Node handlers independently from the
browser bundle.

Article and advisor records are separate business features under
`apps/api/src/business/content`, with public read controllers and staff-only
management controllers. Staff changes are transactional with their audit events;
metadata records field names and publication state, not article copy or advisor
contact details.

The customer request workflow is in `apps/api/src/rfqs/rfqs.module.ts`. Customer
submissions use the authenticated customer identity; staff status changes record
the actor and new status transactionally without duplicating request contact data.

## Storage and media assets

`apps/api/src/storage/storage.controller.ts` owns the authenticated upload and
media-list routes. `image-file.ts` detects supported formats from file signatures.
`StorageService` handles the object-storage provider, while `MediaAssetsService`
owns searchable asset records and upload audit events. The admin library lives
in `apps/admin/src/features/content/MediaLibrary.tsx`; its styles are colocated.
`scripts/backfill-media-library.cjs` reconciles supported objects under `images/`
with the database. It defaults to a read-only dry run and only writes index rows
when passed `--apply`; it never changes bucket objects. Database shape and migration
live in the usual Prisma schema and migration paths.

Quotation reminder forms and reminder history live in
`apps/admin/src/features/sales/QuoteFollowups.tsx`. The component declares its
quotation/reminder data contract and receives save callbacks from the business
shell; API requests and feedback remain owned by that shell.

## Admin feature loading

The admin `App.tsx` lazily imports catalogue, staff, sales, business and website
content screens. Keep feature imports dynamic so login and overview do not load
every editor. `components/FeatureBoundary.tsx` provides the loading state and a
recoverable failure message while retaining workspace navigation. Its key follows
the active tab so another screen can open after a feature load fails. React caches
a rejected lazy import; the recovery button reloads the workspace to retry it.

`apps/api/src/auth/staff-access.ts` maps staff routes to named permissions, and
`staff-access.spec.ts` contains the role/action contract across the V1 roles.
When adding a staff route, add its explicit permission mapping and a matrix case;
unmapped staff routes must continue to fail closed. Browser/database acceptance
still needs to exercise the workflows with persisted staff accounts.

## Audit review

`apps/api/src/audit` exposes a read-only, paginated audit query for owner/admin
roles. It selects actor name/role, never password/session fields.
`apps/admin/src/features/audit/AuditLog.tsx` owns filtering, paging and record details.
Workflow code must write audit records transactionally with the change it records;
the review screen alone does not establish complete event recording.

Catalogue product creation, edits, archival, and SKU price changes are handled
in `products/products.service.ts` with their audit records in the same database
transaction. Metadata records the affected fields and variant count without
copying product descriptions or the submitted catalogue payload.

Staff account creation, role/access updates, and password resets are recorded by
`auth/staff-management.controller.ts` in the same database transaction as each
change. Audit metadata records the assigned role, changed field names, or session
revocation; it never stores the submitted password or contact details.

Manual customer follow-ups are created and versioned by
`workspace/workspace.controller.ts`; each successful create or update records the
staff actor, status, source, and changed field names in the same transaction. The
audit metadata excludes customer names, phone numbers, notes, and material data.
Website draft saves and publications are audited in
`site-content/site-content.controller.ts` using changed content keys only; the
page copy itself stays out of audit metadata.

Quotation audit writes are explicit in `quotes/quotes.service.ts`, inside the same
transaction as creation, editing, revision, publication and margin changes. Staff
controllers pass the authenticated actor ID; direct system calls may omit it.
Metadata contains action references/counts and changed financial values, rather
than copying customer contact details or whole request bodies.
Customer acceptance and decline events are written from
`auth/customer.controller.ts` in the quote-response transaction. These identify
the customer actor and quote/order references without copying customer contact
details.

Supplier creation and edits, supplier product changes and ratings, procurement
request creation, and supplier quote receipt/revision also write audit events in
their business transactions. Keep supplier contact data and rating comments out
of audit metadata; record entity identifiers, changed field names, status, and
bounded counts instead. Purchase-order creation, approval, sending, and revisions
are audited in the purchase-order feature. Commission creation/approval and
loyalty policy/point adjustments are recorded transactionally; these events cover
calculation and approval workflows only, with no payment action. The current
action-by-action review is complete for the staff write routes in this release;
update the implementation status if new staff mutations add audit requirements.

Discount creation and activation controls live in
`apps/admin/src/features/discounts/DiscountRules.tsx`, with an explicit rule-response
contract. The business console supplies API callbacks and save state. Backend
validation/persistence remain in `business/discounts/discount-rules.controller.ts`.

Notification status review lives in `apps/api/src/jobs/notification-status.controller.ts`
and `apps/admin/src/features/notifications/NotificationStatus.tsx`. The read API
selects only job references/timestamps/outcomes, excluding payloads that may contain
contacts or attachments. Owner/admin access uses the audit-read permission.

`features/sales/OrderDetails.tsx` renders the saved material/unit/price snapshots
and delivery destination for staff order review. It is a pure read-only component;
dispatch actions and role checks remain in `SalesOperations.tsx`.
