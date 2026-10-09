# Local PostgreSQL

Local development uses the PostgreSQL service from the root `compose.yaml`.
The app database is `material_square_dev`; API integration tests must use a separate
`material_square_test` database. This keeps test writes away from the customer,
admin, and catalogue data used by the browser. Compose exposes PostgreSQL on
`127.0.0.1:55432`, avoiding conflicts with host PostgreSQL services on ports
5432 and 5433; `.env.example` points the app `DATABASE_URL` at this Compose
database.

1. Copy `.env.example` to `.env` and review local connection values.
2. Run `npm run infra:up` to start PostgreSQL, Redis, and the local S3-compatible media service (Adobe S3Mock).
3. Run `npm run db:generate` and `npm run db:deploy` to prepare the app schema.
4. To run the database integration suite, create `material_square_test` once,
   apply migrations with `DATABASE_URL` temporarily set to that database, then
   run `npm test` with `TEST_DATABASE_URL` set to it. Do not reuse the app DB.
5. Add catalogue records only when you have approved client data. The API does
   not generate product catalogue rows on startup.

One-time integration-test database setup and test command:

```sh
docker compose exec -T postgres psql -U material_square -d postgres -c 'CREATE DATABASE material_square_test;'
DATABASE_URL=postgresql://material_square:local-development-only@127.0.0.1:55432/material_square_test npm run db:deploy
TEST_DATABASE_URL=postgresql://material_square:local-development-only@127.0.0.1:55432/material_square_test npm test -- --runInBand
```

Use committed migrations to update an existing database. Do not reset a database
to apply changes. The migrations preserve staff credentials, customer CRM
records, and quote/order links. The phone-verified customer portal stores
hashed, revocable account sessions; customer quote lists remain browser-local.
Remove temporary developer staff accounts as a separate handover operation
after testing.
