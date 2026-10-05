# Self-hosted deployment preparation

This is an alternative self-hosted option for the public customer website, customer account portal, protected admin workspace, and API. It has not been deployed or container-tested in this environment. Caddy terminates HTTPS; PostgreSQL remains private and persists in a named volume. The admin workspace is served at `/admin/`. Customer browsing and guest material lists remain public; phone/OTP sign-in uses the configured MSG91 widget and server-side token verification.

## Required inputs

- A Linux server with Docker Engine and Compose, sufficient disk space, and ports 80/443 available.
- Customer website DNS pointing to that server.
- Client-approved contact details, catalogue, business claims, policies, and product images.
- An S3-compatible object-storage bucket and CDN/public asset URL for product images.
- MSG91 widget ID and token-auth value for the customer-site build, plus the server-only MSG91 auth key for the API. Keep the server key out of browser build variables.
- An independent backup destination and monitoring service.

## Prepare and launch

1. Copy `deployment/production.env.example` to `.env.production`. Enter the customer domain and generate private database/API secrets. Keep this file private.
2. Validate with `docker compose --env-file .env.production -f compose.production.yaml config --quiet`.
3. Build with `docker compose --env-file .env.production -f compose.production.yaml build`.
4. Start the database with `docker compose --env-file .env.production -f compose.production.yaml up -d postgres`.
5. Apply migrations with `docker compose --env-file .env.production -f compose.production.yaml run --rm api npm run db:deploy`.
6. Start services with `docker compose --env-file .env.production -f compose.production.yaml up -d`.
7. Add only client-approved products in the admin catalogue. Deployment does not seed sample inventory; new listings remain unpublished until reviewed and explicitly published by staff.
8. Provision the initial client administrator with `bash scripts/create-production-staff.sh` from a secure operator shell after setting `PRODUCTION_DATABASE_URL`. The script prompts for the administrator details and password without saving them. The client can create staff accounts in the workspace.
9. Check HTTPS, `/admin/`, `/api/health/ready`, product search/detail pages, guest material-list behavior, MSG91 OTP and customer account ownership, and WhatsApp/email handoff.

The gateway requires the domain to resolve correctly for certificate issuance. Only ports 80/443 are public; database and API ports are internal. `TRUST_PROXY_HOPS=1` matches this gateway topology. Reassess it if adding another proxy or exposing the API directly.

## Backups and updates

Run `bash scripts/backup-production.sh` before migrations and regularly through the hosting backup scheduler. Store backups in an independent encrypted destination and agree retention with the client. Restore into a new isolated PostgreSQL database and verify records before any production recovery.

For updates, retain the previous image/release, take a backup, build the new images, apply reviewed migrations, then restart. Roll back the application image only when compatible with the migrated schema. Database rollback requires a separately reviewed restore plan.

`/api/health` checks the process; `/api/health/ready` checks database connectivity. Set an external uptime monitor against readiness and the website. For managed Vercel and Render deployment, see [vercel-render.md](vercel-render.md).
