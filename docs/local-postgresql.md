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

The schema includes customer accounts, saved material lists, customer sessions, hashed OTPs, staff users, enquiries, contacts, products/brands, quotations, orders, dispatch records, audit logs, and the notification outbox. An existing table does not mean the corresponding business workflow is complete. Product, brand, and staff records must be supplied separately; database setup does not populate them automatically.

## Schema changes

Run from the project root:

```sh
npm run db:generate
npm run db:deploy
```

Use the committed Prisma migrations to update existing databases. Do not reset the database to apply changes or use the demo setup script for this development database. The demo environment uses its own separate database.

## Development and deployment

This database stores data on this Mac and is suitable for local development. A deployed backend needs its own hosted PostgreSQL connection and backups. All devices that use the same backend will use that backend's database; accessing the frontend alone does not connect a device to this Mac's database.

Verification on 2026-10-02: all four current migrations applied; database reads/writes verified in a rolled-back transaction; API `/api/health/ready` returned HTTP 200 with `status: ready`. Existing records were preserved.
