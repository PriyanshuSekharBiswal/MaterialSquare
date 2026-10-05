# Local PostgreSQL

Local development uses the PostgreSQL service from the root `compose.yaml`.
The development database is separate from any hosted database.

1. Copy `.env.example` to `.env` and review local connection values.
2. Run `npm run infra:up` to start PostgreSQL, Redis, and MinIO.
3. Run `npm run db:generate` and `npm run db:deploy` to prepare the schema.
4. Add catalogue records only when you have approved client data. The API does
   not generate product catalogue rows on startup.

Use committed migrations to update an existing database. Do not reset a database
to apply changes. Migration `202610050004_remove_account_signin` deletes customer
and staff account rows; quote/order/audit records are retained and unlinked from
accounts where supported. This repository change does not run migrations against
a hosted database.
