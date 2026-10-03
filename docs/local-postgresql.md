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

The database schema also retains tables for workflows outside the agreed V1. An existing table does not mean the corresponding business workflow is complete. For V1, product records are seeded as unpublished drafts, while prices, stock, and approved images must be supplied by the client team.

## Schema changes

Run from the project root:

```sh
npm run db:generate
npm run db:deploy
```

Use the committed Prisma migrations to update existing databases. Do not reset the database to apply changes or use the demo setup script for this development database. The demo environment uses its own separate database.

## Development and deployment

This database stores data on this Mac and is suitable for local development. A deployed backend needs its own hosted PostgreSQL connection and backups. All devices that use the same backend will use that backend's database; accessing the frontend alone does not connect a device to this Mac's database.

Verification on 2026-10-03: the local PostgreSQL database at `material_square_dev` accepts connections, and Prisma reports all 14 committed migrations applied. The two pending V1 migrations for offer scheduling and aggregate analytics were applied additively; no database reset was performed. All 48 API tests passed against a disposable PostgreSQL test cluster, and all 14 browser acceptance tests passed. The temporary test cluster was stopped and removed after the run; the integration suites were not pointed at the development database. Never point those destructive fixtures at production.
