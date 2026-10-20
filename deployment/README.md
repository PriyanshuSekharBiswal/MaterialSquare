# Self-hosted deployment preparation

This is an alternative self-hosted option for the public customer website, customer account portal, protected admin workspace, and API. It has not been deployed or container-tested in this environment. Caddy terminates HTTPS; PostgreSQL remains private and persists in a named volume. The admin workspace is served at `/admin/`. Customer browsing and guest material lists remain public; phone/OTP sign-in uses the configured MSG91 widget and server-side token verification.

## Required inputs

- A Linux server with Docker Engine and Compose, sufficient disk space, and ports 80/443 available.
- Customer website DNS pointing to that server.
- Client-approved contact details, catalogue, business claims, policies, and product images.
- An S3-compatible object-storage bucket and CDN/public asset URL for product images.
- MSG91 widget ID and token-auth value for the customer-site build, plus the server-only MSG91 auth key for the API. Keep the server key out of browser build variables.
- Unique PostgreSQL, Redis, and JWT secrets. Redis is private to the Compose network and is password protected; configure approved MSG91 SMS templates or an HTTPS notification webhook if notification delivery is being enabled.
- An independent backup destination and monitoring service.

## Prepare and launch

1. Copy `deployment/production.env.example` to `.env.production`. Enter the customer domain and generate unique database, Redis, and API secrets. Generate `JWT_SECRET` with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Write a separate Redis password with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to the configured `REDIS_PASSWORD_FILE` path. The API container runs as `node` (UID/GID 1000), so make the secret root-owned, group-readable by GID 1000, and inaccessible to other users (`sudo chown root:1000 "$REDIS_PASSWORD_FILE" && sudo chmod 640 "$REDIS_PASSWORD_FILE"`). Keep the containing directory traversable by the Docker daemon, store all credentials in the hosting secret manager, and keep `.env.production` private.
2. Validate with `docker compose --env-file .env.production -f compose.production.yaml config --quiet`.
3. Build with `docker compose --env-file .env.production -f compose.production.yaml build`.
4. Start PostgreSQL and Redis with `docker compose --env-file .env.production -f compose.production.yaml up -d postgres redis`.
5. After taking a backup, apply migrations with `docker compose --env-file .env.production -f compose.production.yaml run --rm api npm run db:deploy`. This must run before the API rollout; verify the rate-limit bucket, customer session expiry, and customer session rotation grace migrations are recorded.
6. Start services with `docker compose --env-file .env.production -f compose.production.yaml up -d`.
7. Provision the initial client administrator from the API container with `docker compose --env-file .env.production -f compose.production.yaml exec api bash scripts/create-production-staff.sh`. The script uses the private `DATABASE_URL` already configured inside the container and prompts for account details without saving them. Do this before adding products.
8. Add only client-approved products in the admin catalogue. Deployment does not seed sample inventory; new listings remain unpublished until reviewed and explicitly published by staff.
9. Check HTTPS, `/admin/`, `/api/health/ready`, product search/detail pages, guest material-list behavior, MSG91 OTP and customer account ownership, and WhatsApp/email handoff.

The gateway requires the domain to resolve correctly for certificate issuance. Only ports 80/443 are public; PostgreSQL, Redis, and API ports are internal. Redis reads its password from the mounted `REDIS_PASSWORD_FILE` secret and has persistent AOF storage. `TRUST_PROXY_HOPS=1` matches this gateway topology. Reassess it if adding another proxy or exposing the API directly.

The JWT issuer/audience hardening invalidates staff JWTs issued by the previous
release; staff members will sign in again after deployment. Production
notification webhooks must use HTTPS and a private token of at least 32 bytes.
`VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` are public browser-build
values; keep `MSG91_AUTHKEY` on the API only.

## Backups and updates

Run `bash scripts/backup-production.sh` before migrations and regularly through the hosting backup scheduler. Store backups in an independent encrypted destination and agree retention with the client. Restore into a new isolated PostgreSQL database and verify records before any production recovery.

For updates, retain the previous image/release, take a backup, build the new images, apply reviewed migrations, then restart. Roll back the application image only when compatible with the migrated schema. Database rollback requires a separately reviewed restore plan.

`/api/health` checks the process; `/api/health/ready` checks database connectivity. Set an external uptime monitor against readiness and the website. For managed Vercel and Render deployment, see [vercel-render.md](vercel-render.md).
