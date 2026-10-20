# Product requirements document

**Product:** Material Square client inventory marketplace and operations workspace  
**Status:** Current product baseline; confirm business details and content with the client before release.  
**Related documents:** [System design](../engineering/design.md), [Product requirements](requirements.md), [Code structure](../engineering/code-structure.md), [Production readiness](../operations/production-readiness.md).

## 1. Product summary

Material Square is a single-seller construction-materials marketplace for customers and an internal operations system for the client’s staff. The public storefront presents only client-approved inventory. Customers can build a material list and request a quotation; staff prepare and publish quotations, coordinate sourcing and dispatch, and record offline receipts. The website does not process payments.

The product consists of a customer storefront, a protected staff workspace, a REST API, and a PostgreSQL database. Staff manage product and business content in the admin workspace. The customer experience reads the same published catalogue through public API endpoints.

## 2. Problem and users

Customers need a trustworthy way to inspect the client’s real inventory, compare product options, prepare project quantities, and ask the business for a quote. They need to see only their own submitted requests and the quotations and orders associated with them.

Staff need one operational workspace for customer enquiries, catalogue publishing, quotation preparation, supplier sourcing, procurement, dispatch, content, audit history, and reports. Supplier sourcing and commercial buy-side information must remain internal.

### User roles

| User | Goals | Access boundary |
| --- | --- | --- |
| Visitor | Browse published products, prepare a browser-local material list, contact the business | Public content and published client inventory |
| Customer | Submit a request and review their own requests, quotations, orders, delivery and loyalty history | Phone-verified customer session; ownership enforced by API |
| Staff | Perform assigned business operations | Staff session plus role/permission checks on the API |
| Client administrator | Manage staff, permissions, content, catalogue and business settings | Administrator permissions; operations remain auditable |

## 3. Product goals and success measures

- Every public product claim comes from published client records or approved business content.
- A customer can move from catalogue discovery to a saved RFQ without creating an account until submission is required.
- A verified customer can access only their own account records across reloads and supported account actions.
- Staff can prepare and publish a quotation from an RFQ, then track sourcing, order and fulfilment work without exposing internal supplier or buy-price data to customers.
- Staff can find records in large operational collections without every initial screen request loading every record.
- Production releases are repeatable, migrations are applied deliberately, and client data can be backed up and restored.

Operational measurements to establish before launch: public catalogue search success, RFQ completion rate, staff time from RFQ to published quotation, quote-to-order conversion, supplier response time, dispatch completion time, API error rate, page/API latency, and backup restore time. No production baselines are currently asserted here.

## 4. Functional requirements

### 4.1 Public catalogue and material list

1. Display only published, non-deleted client catalogue listings and their active public data.
2. Support search and discovery by product name, brand, category and product attributes, plus availability and other supported catalogue facets.
3. A product detail page must show the saved product and variant options, unit/pack, price where approved, stock status, minimum order, offer details and client-supplied images.
4. A visitor can add products and quantities to a browser-local material list without signing in.
5. A customer can edit and review the list before submitting a request. A request must preserve a canonical snapshot of the selected published item and variant details where applicable.
6. General enquiry handoff may open WhatsApp or email with a prepared message; the product must not claim delivery unless a provider reports it.

### 4.2 Customer account

1. Customer sign-in uses the configured phone verification provider and a verified one-time code. No password or unverified fallback is permitted.
2. Customer sessions are revocable, HTTP-only cookies. A session is scoped to its browser; another browser requires a new sign-in.
3. The customer can review their own profile, RFQs, published quotations and alternatives, orders, delivery status, purchase history and loyalty activity.
4. Every customer-scoped API read and write derives the customer identity from the verified session and checks ownership server-side. Client-supplied customer IDs are not an authorization mechanism.
5. The customer can accept or decline a published quotation. The API must claim the current quotation atomically; duplicate or stale responses must not create duplicate business records.

### 4.3 Staff workspace

1. Staff sign in with a provisioned phone number or email and password. Browser sessions use secure HTTP-only cookies.
2. The UI may hide unavailable actions, but the API must independently enforce permissions for every protected operation.
3. Catalogue staff can create, edit, preview, publish, unpublish and soft-delete listings and variants. Changes to commercial fields must be auditable.
4. Sales staff can review and assign RFQs, prepare/edit/revise quotations, manage discounts and follow-ups, and publish customer-visible quotations.
5. Orders and dispatch staff can review order details, update fulfilment and record delivery evidence according to permission.
6. Supplier and procurement staff can manage suppliers, product coverage, supplier availability, quotes, allocations and purchase orders. Supplier contact details and buy-side prices are staff-only.
7. Accounts staff can record payments already received offline, including method, optional reference/note, actor and timestamp. The website must not initiate or verify payment.
8. Content staff can edit and publish approved site content, managed pages, media, policies, blogs and expert profiles with preview where supported.
9. Staff actions that change business state must produce an audit record with actor, entity, action and useful metadata.
10. High-volume staff lists must fetch bounded API pages and expose a clear path to older records. Filtering must disclose whether counts/results cover loaded records only.

### 4.4 Integrations and operations

- MSG91 is the current customer OTP provider. Its server credential stays on the API; browser widget identifiers are public configuration.
- A Wa Bridge migration for OTP and customer notifications/reminders is planned, but is not implemented or a release acceptance criterion yet.
- Notification queue, MSG91 SMS, and webhook code exists in the repository, but delivery configuration and provider QA are deferred. Queued or provider-accepted messages must not be described as delivered to a handset.
- S3-compatible storage holds uploaded media and private RFQ attachments. Private files must be authorized before streaming.
- PostgreSQL/Prisma is the source of truth. Schema changes are versioned migrations and are applied before API rollout.
- CORS, trusted origins, proxy hops, body size, rate limits and session cookie settings are explicit environment/deployment configuration.

## 5. Core journeys and acceptance criteria

### Visitor to RFQ

1. Visitor searches published inventory and opens a product detail.
2. Visitor adds the chosen variant and quantity to the material list.
3. Visitor supplies project and delivery details and completes the required phone verification.
4. The API creates one customer-linked RFQ with an inventory snapshot and the UI confirms the saved request.

**Accept when:** unpublished/deleted products are excluded; invalid quantities and unsupported variants are rejected; the saved request appears in the customer account and staff RFQ queue; a customer cannot read another customer’s request.

### Staff RFQ to order

1. Authorized sales staff review and assign an RFQ.
2. Staff select catalogue or inventory items, set price/discount/tax/freight and prepare a quotation.
3. Authorized staff publish the quotation; the customer can then see it in their account.
4. A customer response is claimed once. Accepting creates the order/procurement work atomically; declining does not create an order.
5. Staff source shortfall, approve procurement, dispatch goods and record delivery events.

**Accept when:** stale/replayed responses cannot create duplicate orders; supplier details and internal margins are absent from customer responses; all mutation APIs enforce permission and record audit context.

### Catalogue publication

1. Catalogue staff create/edit a draft using client-supplied product data and media.
2. Staff preview the draft and verify all commercial fields and photos.
3. Staff explicitly publish it; the storefront/search/sitemap use only the published record.

**Accept when:** draft or unapproved starter data is not publicly discoverable, metadata is consistent with the product, and unpublishing removes it from public discovery without losing the staff record.

## 6. Non-functional requirements

- **Security:** server-side access control, ownership checks, safe cookies, input validation, rate limits, origin validation, private-file authorization and no secrets in the browser bundle.
- **Correctness:** transactional writes for coupled business state; optimistic/conditional claims for one-time actions; deterministic list ordering; idempotency where external retries can repeat a side effect.
- **Performance:** bounded list payloads, stable pagination, database-backed search/filtering for large datasets, lazy loading of noncritical UI, and measured budgets for Core Web Vitals and API latency.
- **Accessibility:** keyboard-operable forms and dialogs, semantic labels, visible focus, error/status announcements and sufficient contrast.
- **Reliability:** health/readiness endpoints, graceful shutdown, bounded retries, job deduplication, backup verification and documented recovery.
- **Maintainability:** shared types for API contracts, business calculations isolated from persistence, feature-oriented UI modules and a maintained architecture decision record for changes that cross boundaries.
- **Privacy:** collect only needed customer data, restrict operational data to authorized staff, and use explicit retention policies for attachments, logs and deleted records.

## 7. Out of scope and release gates

Online checkout, payment initiation and payment verification are explicitly out of scope. Client-approved catalogue, pricing, imagery, policies, public domain, production provider credentials, staff provisioning, hosting configuration, monitoring and a tested isolated restore are release gates. A passing local build or fixture-backed browser test does not establish production readiness.

## 8. Open product decisions

- Confirm the customer-visible service area, delivery charges, taxes and quotation validity rules with the client.
- Confirm the retention period for customer sessions, RFQ attachments, audit records and soft-deleted business records.
- Agree the exact list/search/filter behavior and expected catalogue size for staff and customer screens.
- Define measurable launch SLOs and error/latency alert thresholds.
