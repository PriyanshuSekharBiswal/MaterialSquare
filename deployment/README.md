# Material Square deployment preparation

This is a self-hosted deployment option, prepared without choosing or purchasing a host. It has not been deployed or container-tested in this environment (Docker is unavailable). The website and staff app each proxy `/api` to NestJS, so customer session cookies stay on the same origin. Caddy terminates HTTPS. PostgreSQL is private and persists in a named volume.

## Required inputs before launch

- A Linux server with Docker Engine and Compose, sufficient disk space, and ports 80/443 available.
- Website and staff subdomain DNS records pointing to that server.
- Client-approved contact details, catalogue, business claims and policies (see `docs/launch-content-review.md`).
- An active MSG91 OTP Widget. Keep its Authkey in the API host's private settings and the widget ID/client token in the customer frontend environment.
- Independent backup destination and monitoring service.

## Prepare and launch

1. Copy `deployment/production.env.example` to `.env.production` in the repository root. Enter real domains. Generate separate secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Use hexadecimal passwords because the database password is interpolated into a URL. Keep this file private.
2. Validate: `docker compose --env-file .env.production -f compose.production.yaml config --quiet`. Avoid printing rendered configuration because it contains secrets.
3. Build: `docker compose --env-file .env.production -f compose.production.yaml build`.
4. Start database: `docker compose --env-file .env.production -f compose.production.yaml up -d postgres`.
5. Apply migrations: `docker compose --env-file .env.production -f compose.production.yaml run --rm api npm run db:deploy`.
6. Start services: `docker compose --env-file .env.production -f compose.production.yaml up -d`.
7. Create the first staff account with `bash scripts/create-production-staff.sh`; it prompts for the password without echoing it. Do not put passwords in chat or repository files.
8. Check HTTPS, `/api/health/ready`, real OTP delivery, returning login, saved list on another device, logout, and recipient/message previews. No real messages are sent by the preview until a user sends them.

The gateway requires both domains to resolve correctly for certificate issuance. Only ports 80/443 are public; database and API ports are internal. `TRUST_PROXY_HOPS=1` is appropriate for this exact gateway topology. Reassess it if adding another proxy or exposing the API directly.

## Backups and updates

Run `bash scripts/backup-production.sh` before migrations and regularly in your hosting backup scheduler. It writes a restricted-access gzip SQL backup under ignored `backups/`. Copy backups to an independent encrypted destination; a copy on the same server is insufficient for disaster recovery. Set retention with the client. This task does not install a recurring backup schedule.

Restore a backup into a NEW isolated PostgreSQL database using `gunzip -c backup.sql.gz | psql NEW_DATABASE_URL`. Verify customers and saved lists there before any production recovery. Do not restore over a live database or delete the production volume as a routine update.

For updates: retain the previous image/release, take a backup, build the new images, apply reviewed migrations, then restart. Roll back the application image only when compatible with the migrated schema. Database rollback requires a separately reviewed restore plan; migrations are not automatically reversible.

`/api/health` checks the process; `/api/health/ready` checks database connectivity. Connect an external uptime monitor to readiness and the website. Container health checks report failures; Docker restart policy alone does not restart an unhealthy but still-running process. Add alerts through the hosting service.

Redis jobs, object storage and automated quotation delivery are not required for the direct WhatsApp/email launch; their existing development configuration remains in `compose.yaml`. Product illustrations are shipped as static site assets. This configuration does not publish the site through Vercel; the existing Vercel file still hosts only the frontend and requires a separately configured API origin/proxy.
