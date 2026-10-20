# Code structure

The repository is organized by application and shared capability:

- `apps/web` contains the public customer website and browser-local quote list.
- `apps/api` contains the public catalogue, published site content, analytics,
  quote handoff support, and persistence integrations.
- `apps/admin` provides protected sign-in and the client operations workspace.
- `packages/db` owns Prisma models and SQL migrations.
- `packages/types` owns shared catalogue models, validation, and site content.
- `deployment` contains container and managed-host deployment configuration.
- `docs` contains product scope, operating requirements, and engineering notes.

For runtime boundaries, trust relationships, and request flows, see [System
design](design.md). Product behavior is described in the [PRD](../product/PRD.md).

## Ownership and conventions

Use the business capability as the directory boundary. Use PascalCase for React
components and screens, kebab-case for other TypeScript modules, and descriptive
lowercase names for scripts and styles. Keep the application composition roots
small and put state, validation, and presentation beside the feature that owns
them.

Controllers validate input and delegate to services. Services coordinate
database reads, state changes, and transactions. Extract calculations into
focused typed functions when they can run independently of persistence. Keep
transaction boundaries around changes that must succeed together.

Prefer readable names, small functions, and direct control flow. Avoid
speculative frameworks and abstractions without a concrete use. Update this
guide when a new top-level capability or ownership rule is introduced.

Large feature files should be split by a real responsibility boundary when a
change requires unrelated screen sections, data loading, and domain rules to be
understood together. Keep public behavior and state ownership explicit during
extraction; do not split solely to reduce a line count. Avoid adding new
controller-level Prisma orchestration when the use case has a transaction,
authorization-sensitive query, or domain rule that belongs in a service.

## Public catalogue

Catalogue queries must use published client records. Search, suggestions,
filters, product details, prices, offers, variants, availability, and minimum
order quantities must be derived from the same inventory data. Do not add
fabricated products or generated product photography. Client images are
referenced from approved URLs or the configured asset store.

## Customer request list

The guest quote list is browser-local. A signed-in customer can submit that list
as an RFQ, which is saved to the customer account and staff queue. General
enquiries may open a WhatsApp or email handoff. Do not describe an external
handoff as sent or delivered unless the provider confirms it.

## Database operations

The client maintains staff and catalogue records through approved database
operations. Database migrations are the source of truth for schema changes.
Never use application seed data as production inventory.
