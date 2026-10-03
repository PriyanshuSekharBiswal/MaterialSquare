# Local PostgreSQL development database

The website API connects to the local development database through `DATABASE_URL` in the root `.env`. Keep that file private; it contains credentials.

## Current connection

| Setting | Value |
| --- | --- |
| pgAdmin server name | Material Square — Development |
| Host | 127.0.0.1 |
| Port | 5432 |
| Database | material_square_dev |
| Database user | material_square_dev |
| Running PostgreSQL version | 14.17 (Homebrew) |

The application database user is not a PostgreSQL superuser and cannot create roles or databases. Other PostgreSQL registrations shown in pgAdmin are separate connections; the application uses the connection above.

## Viewing data

In pgAdmin, expand **Servers → Material Square — Development → Databases → material_square_dev → Schemas → public → Tables**. Right-click a table and choose **View/Edit Data → All Rows** to inspect its records. Avoid editing authentication/session records manually.

The database schema also retains tables for workflows outside the agreed V1. An existing table does not mean the corresponding business workflow is complete. The production database starts with an empty catalogue. Local development and demo databases can seed illustrative preview products and sample prices; those are not client-approved inventory. The 22 local demo families are published for testing, but their stock starts unavailable.

## Schema changes

Run from the project root:

```sh
npm run db:generate
npm run db:deploy
```

Use the committed Prisma migrations to update existing databases. Do not reset the database to apply changes or use the demo setup script for this development database. The demo environment uses its own separate database.

## Development and deployment

This database stores data on this Mac and is suitable for local development. A deployed backend needs its own hosted PostgreSQL connection and backups. All devices that use the same backend will use that backend's database; accessing the frontend alone does not connect a device to this Mac's database.

Verification on 2026-10-03: the local `material_square_dev` database and separate `material_square_demo` database both have all 18 committed migrations applied. The demo API uses port 55440 and seeds 22 illustrative families with 63 variants, all stock unavailable. The normal development database is on port 5432; its product seed runs when its API starts. All 56 API tests passed against a separate isolated test database, including the PostgreSQL integration suites for customer/staff access and persistence. The temporary test database was dropped after the run; neither persistent database was used by the test fixtures. Never point those destructive fixtures at production.
