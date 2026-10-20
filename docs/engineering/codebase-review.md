# Codebase review

## Scope and result

The complete tracked codebase was reviewed with CodeRabbit Deep Review in bounded directory groups because the repository exceeds the free CLI's 150-file limit. The source-review breakdown below totals 95 findings across the API, admin, shared packages, storefront, API proxy/SEO handlers, scripts, browser tests, documentation, and deployment configuration. A second review of the actual working-tree changes reported 10 findings; these were addressed in the relevant source files. Some working-tree findings overlap the source review, so the pass totals do not represent unique defects.

| Area | Findings |
| --- | ---: |
| API | 27 |
| Admin | 15 |
| Shared packages | 20 |
| Storefront source | 11 |
| Web API handlers | 4 |
| Scripts | 10 |
| Browser tests | 2 |
| Documentation | 4 |
| Deployment | 2 |
| **Total** | **95** |

The repository is a useful product foundation with clear app/package boundaries and a broad feature set. The main engineering risk is that domain rules and persistence behavior have accumulated across controllers, services, React screens, scripts, and historical migrations. That makes consistency and safe releases harder than the UI feature count alone suggests. The current review fixes address concrete runtime, data-flow, security-boundary, and performance defects; they do not replace production data validation or an environment-specific migration review.

### Follow-up deep review — 19 October 2026

CodeRabbit Deep Review examined 118 changed files in the current working tree and raised four issues: one critical, one major, and two minor. All four were checked against their callers and corrected:

1. Customer account detail routes could dereference a cached quote/order while signed out when both optional profile IDs were `undefined`. The cache now requires a non-null profile and cache entry.
2. Catalogue manager and global admin search could miss products outside the loaded pages. Global search now uses the API match query instead of loading the entire catalogue; the catalogue screen queries and merges bounded server matches, and the API searches persisted and derived product codes plus slugs.
3. Rejecting a guest-list update at the 100-item limit returned `false` without replacing a stale storage error. The provider now reports the limit, and cart, quotation, and product-detail flows expose provider errors accessibly.
4. A very long challan item name could overflow a continuation page. The PDF row height is now bounded to the available continuation-page space and long names are clipped with an ellipsis so the quantity remains with its row.

The earlier notification-readiness finding remains intentionally untouched: notification work is deferred by product direction. This pass did not run builds or automated tests. The full review totals above refer to earlier bounded source reviews; the 118-file follow-up is a separate changed-working-tree pass, not a new review of every unchanged line.

The subsequent CodeRabbit review of the updated working tree returned nine findings. All were verified and fixed: PDF quantity clipping; safe HTML replacement for FAQ text; return-policy metadata lookup and unpublished breadcrumbs; accepted-quote state on revisit; failed-to-scheduled follow-up transitions; stale-note protection during concurrent reschedules; catalogue search refresh after edits; and the design document's outdated catalogue-search description. The review also covered the new FAQ/legal route handling.

### SEO route review — 19 October 2026

The storefront has route-specific server metadata, canonicals, crawler controls, JSON-LD, and a published-content sitemap. This pass found that `/faq`, `/shipping`, and `/return-policy` could appear in the sitemap while direct requests fell through to a 404. Server-rendered fallbacks and route metadata now cover these paths, and the client keeps FAQ structured data after hydration. See [the SEO review](seo-review.md) for scope, remaining content and production checks, the intentionally non-indexed city pages, and the product rich-result limitations.

## Changes made

- Added bounded pagination to staff RFQ, quote, order, and catalogue APIs and coordinated admin screens; added supporting database indexes and kept page metadata/order deterministic.
- Fixed request and state races, including duplicate customer RFQ submission, stale supplier/search results, customer list persistence order, stale page content, and variation/quote editor edge cases.
- Hardened API and web proxies against malformed encoding, path traversal, and unsafe upstream paths; bounded rate-limit key cardinality and corrected CORS initialization order.
- Corrected business-data behavior in quote expiry, payment precision, purchase-order allocations, loyalty updates, supplier restoration, catalogue code lookup, and role-filtered payment details.
- Prevented notification queue starvation when an event lacks a configured route, constrained audit activity reads, and corrected several PDF continuation-page layout cases.
- Improved storefront loading/scroll restoration and removed avoidable repeated catalogue requests. Added API-side sitemap filtering for deleted listings.
- Fixed deployment wiring for the MSG91 widget, staff provisioning, media backfill, backup naming, and development process shutdown.
- Added product, architecture, code-structure, release, and manual-QA documentation and aligned customer RFQ/quotation behavior with the implementation.

## Release and data follow-ups

These findings involve historical migrations or existing production data. They need a database/configuration review before changing migration history or applying data mutations:

1. `packages/db/prisma/migrations/202610040007_quotation_brand_options/migration.sql` computes margin/tax values from existing quote data. Rows with a zero, near-zero, or negative denominator may overflow the target decimal precision and fail migration. Check actual values and migration state before applying this migration to any environment.
2. `packages/db/prisma/migrations/202610060004_testing_contact_details/migration.sql` historically wrote staging contact details without an environment guard. New defaults and the public-content sanitizer suppress those exact values, and `202610190004_clear_staging_contact_defaults` clears them only when still unchanged. Review configured contact details with the client before publishing replacements.
3. `packages/db/prisma/migrations/202610170005_centralize_business_details/migration.sql` may replace or remove configured Instagram data and has a hardcoded fallback. Verify the intended client account and existing settings before applying it.
4. `packages/db/prisma/migrations/202610080006_clear_unapproved_catalogue_values/migration.sql` may leave the `Reference product source` field available to public listings. Confirm the migration's resulting public fields and clear unapproved references before publishing catalogue drafts.
5. Product-code persistence still needs an environment-specific backfill. Review `scripts/backfill-catalogue-product-codes.cjs`, take a database backup, inspect the dry-run output, then apply it before the API rollout if the client catalogue is ready. Until persisted codes are complete, API catalogue search scans a compact projection of all eligible listings to derive legacy codes before returning its bounded result page; the final match rows are paginated, but this compatibility scan still grows with the catalogue. Persisting codes and removing that scan is a performance follow-up; no production database was changed during this review.
6. Apply the shared rate-limit bucket migration before deploying the API that uses it. Deployment docs should keep this ordering explicit.
7. Apply the customer session migrations (`202610190002_customer_session_idle_expiry` and `202610190003_customer_session_rotation_grace`) before the API rollout so existing sessions receive the idle-expiry and token-overlap behavior.

Do not edit already-applied historical SQL migrations in place: Prisma records checksums, and changing applied migration files can make deployed environments diverge. Use a new corrective migration after confirming the affected data and current migration table.

## Senior-level recommendations

1. Keep the API as the owner of business rules. Extract repeated validation and state transitions into domain services, and make controllers responsible for HTTP validation, authorization, and response shape.
2. Define pagination as a shared API contract: stable sort plus unique tie-breaker, validated page size, total/has-more semantics, and consistent query parsing. Keep full-collection endpoints out of staff screens.
3. Treat migrations and backfills as release artifacts. Add explicit preflight queries, dry-run output, backup instructions, idempotency, and post-migration verification for every data-changing operation.
4. Separate operational configuration from code and seed data. Avoid hardcoded contact details, credentials, test values, or client-specific defaults in migrations and runtime paths.
5. Add concurrency and authorization coverage for high-impact flows: quote publication/acceptance, inventory edits, payments, loyalty balances, RFQs, staff roles, and notification retries. These suites should run against isolated disposable databases.
6. Establish measurable performance budgets for public route startup, catalogue API payloads, admin list requests, and scroll interaction. Use production-like catalogue sizes to verify pagination rather than relying on small local data.
7. Prefer explicit migration and API deployment sequencing in the release pipeline: backup, migration, API rollout, then web/admin rollout; verify readiness and rollback compatibility at each step.

### Maintainability hot spots

These files combine several responsibilities and make cross-feature changes expensive. Split them when working on the next related behavior, preserving the current API and UI contracts:

- `apps/admin/src/features/catalogue/CatalogueManager.tsx` (3,334 lines at review) owns catalogue pagination, search/filter state, editor and draft recovery, product preview, media upload, and publication actions. Move catalogue data/query state into a feature hook and keep the editor/preview as focused components; do not extract generic state helpers without a second real consumer.
- `apps/admin/src/features/sales/SalesOperations.tsx` (1,983 lines) combines operational navigation, list/detail state, RFQ/quote workflows, and embedded catalogue functionality. Keep route-level orchestration small and move each actual workflow behind a feature boundary.
- `apps/admin/src/features/business/BusinessConsole.tsx` (1,153 lines) combines business-settings sections and navigation state. Split by actual ownership/permission boundaries so a change to one business area does not require reading the full console.
- `apps/web/src/pages/CustomerAccountContent.tsx` (1,514 lines) renders account routes, quotations, orders, profile, and history. Extract route-owned screens while keeping shared account shell, query state, and ownership rules explicit.
- `apps/api/src/products/products.service.ts` (1,112 lines) handles public mapping, catalogue search, category/brand normalization, codes, and mutations. Separate read-model/query code from catalogue write rules when a change needs both, so pagination and public visibility stay consistent.
- `apps/web/src/components/PageMetadata.tsx` (952 lines) and `apps/web/src/server/seo/*` independently decide metadata/indexability. The recent availability-filter defect was duplicated in server and client policy. Extract shared route/query policy into a small environment-neutral helper and keep DOM/HTTP rendering in their respective layers.

Avoid treating line count as the design objective. Extract around data ownership, independent state transitions, and API contracts; keep behavior covered at those seams.

### File naming and test-data audit

The source filename scan found no production application modules named `demo`, `sample`, or `test`, and no code files with a duplicate `2` suffix. The `scripts/seed-procurement-test-suppliers.cjs` utility is explicitly test-named and refuses to run unless `DATABASE_URL` is local `material_square_dev`; it is not a production startup/seed hook. The `apps/web/public/images/carousel_1_*.jpg` through `carousel_6_*.jpg` files are numbered marketing assets rather than duplicate source files. No code reference to those paths exists in this checkout, but persisted Website Content may refer to public assets; verify the target content record before removing or renaming them.

## Verification

On 19 October 2026, `npm run db:generate`, `npm run typecheck`, and `git diff --check` passed after the review fixes. Automated tests and production builds were not run in that session. Review findings were inspected and fixed, but the migration/data follow-ups above remain release checks and need the target database state to validate safely.
