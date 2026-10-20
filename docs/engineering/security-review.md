# Security review and hardening

## Scope

This review focused on authentication, authorization, password/token handling, secret boundaries, request protection, uploads, deployment configuration, and dependency advisories. CodeRabbit's security-focused review of the working-tree changes completed; its issues were in adjacent correctness/stability paths, including a quotation publication bug, which were fixed. A manual source review also found the staff permission mapper was comparing paths with query strings, which denied paginated staff requests; route matching now strips the query before evaluating role permissions.

The repository already has several sound controls: staff passwords use salted scrypt hashes and constant-time comparison; customer session tokens are generated from 256 bits of randomness and stored in the database only as SHA-256 hashes; staff JWTs are held in HttpOnly cookies; customer and staff records are scoped by the authenticated identity; CORS and mutation origins use explicit allowlists; HTTP responses default to `no-store`; role checks fail closed; audit metadata redacts credential-like fields; and upload/download routes validate file content and keep customer attachments private.

## Hardening applied

- Staff JWTs are now pinned to HS256 and require the `material-square-api` issuer and `material-square-staff` audience, in addition to signature, expiry, active-account, and `authVersion` checks. JWT keys must contain at least 32 bytes. Tokens without the new claims will stop working after deployment, so staff will sign in again.
- New, reset, and changed staff passwords now require at least 12 characters, accept long passphrases, and remain capped at 256 characters. Existing passwords of at least 8 characters remain usable at sign-in; legacy passwords shorter than 8 characters must be reset by an administrator before those staff can sign in. Passwords continue to be stored as salted scrypt hashes, never plaintext.
- Customer sessions now extend their 90-day expiry after authenticated activity and rotate the random token at most every 14 days. The database stores only SHA-256 token digests and accepts the previous digest for 15 minutes to tolerate concurrent requests. A purpose-separated HMAC derives the same successor token for retries with the previous token during that grace period, so a lost rotation response can recover without persisting a reversible token. Logout revokes the current and overlapping token. Existing unexpired sessions are grandfathered from migration time because prior activity cannot be reconstructed; the migration caps them at 90 additional days and never extends an earlier expiry.
- Staff login now has a 20-attempt per-IP route limit and a separate HMAC-keyed failure counter per identifier. Every non-2xx response for a schema-valid login attempt consumes the identity budget; a successful sign-in resets it. Failed attempts across IPs increase a progressive delay capped at five seconds instead of hard-locking the account. Identifiers and IPs are not persisted in the rate-limit table. Route groups are fixed so client-supplied path suffixes cannot create unbounded route buckets.
- Production notification webhooks require HTTPS and a bearer token of at least 32 bytes. The worker does not send unauthenticated production webhook requests. Local development may still use a private test webhook without a token.
- The RFQ journey count route is explicitly covered by the role authorization map. Query parameters are stripped before route permission matching, preserving access to paginated screens without weakening route checks.
- Applied npm's non-breaking dependency updates. The critical Handlebars and shell-quote advisories were removed; the full dependency audit still reports development-tooling advisories described below.

## Secret inventory and handling

| Variable | Secret? | Handling |
| --- | --- | --- |
| `JWT_SECRET` | Yes | API only. Generate a unique value with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Replacing it invalidates staff JWTs. |
| `MSG91_AUTHKEY` | Yes | API only. Never put it in a `VITE_*` variable or browser bundle. |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Yes | API only; use a least-privilege storage identity and rotate at the storage provider. |
| `DATABASE_URL` | Yes | API/runtime only; use unique per-environment credentials and restrict network access. |
| `REDIS_PASSWORD_FILE` | Yes | Host-side path to a hexadecimal secret file owned `root:1000` with mode `640`, mounted only into Redis and API containers; keep Redis private to the Compose network and restart both services when rotating it. |
| `NOTIFICATION_WEBHOOK_TOKEN` | Yes | API only; production requires at least 32 bytes and sends it as a bearer credential to the configured HTTPS endpoint. |
| `API_ORIGIN` | No credential by itself | Server-side origin only. Do not embed credentials in the URL. |
| `VITE_MSG91_WIDGET_ID`, `VITE_MSG91_TOKEN_AUTH`, `VITE_API_URL` | Public build values | Vite embeds `VITE_*` values in client code. Treat them as public widget/configuration values, never as private API keys. |

Use a separate key per environment and service. If any secret has appeared in Git history, build output, logs, a support ticket, or a shared chat, treat it as exposed: revoke it at its issuer, create a replacement, update the secret store, deploy, and verify the old credential no longer works. Removing a secret from the current file does not remove it from Git history. JWT key replacement signs out staff. Rotate MSG91 and storage credentials through their providers; do not paste secrets into this repository or review output.

## Dependency audit

`npm audit --omit=dev` reported zero production dependency vulnerabilities before the non-breaking update. `npm audit` found critical advisories in Handlebars and shell-quote; the non-breaking `npm audit fix` removed those. The remaining report is limited to test/build tooling: the Jest dependency tree includes `braces`, and coverage tooling includes `sprintf-js`. Current advisories have no fixed compatible upstream release, and `npm audit fix` indicates the available Jest downgrade would be breaking. Do not force a downgrade. Recheck advisories during each release and remove the exception once compatible fixes exist. Production runtime dependency audit remains the release gate.

## Remaining security work and release checks

1. Apply migrations before deploying the API, including `202610190001_shared_api_rate_limit_buckets`, `202610190002_customer_session_idle_expiry`, and `202610190003_customer_session_rotation_grace`. Back up the target database and verify all three migration rows before API rollout. These migrations have not been applied to a database in this review.
2. Generate and store the production JWT secret and webhook token in the deployment secret manager. The JWT claim change ends existing staff sessions, which is expected; coordinate the rollout and staff reauthentication.
3. Inspect production `CORS_ORIGINS`, `TRUST_PROXY_HOPS`, database/network access, S3 bucket policy, and provider credentials. `TRUST_PROXY_HOPS` must exactly match the trusted reverse-proxy chain; a wrong value can undermine IP-based limits.
4. No Content Security Policy is currently enforced by the web deployments. The storefront loads third-party verification and map resources and uses inline style attributes. Plan a report-only CSP in staging, capture violations, then enforce a narrow policy after approved origins are known.
5. Staff accounts do not currently have MFA. Consider requiring a second factor for owner/admin roles before production use, especially for password resets and financial operations.
6. This repository review cannot confirm provider-side key scopes, secret rotation dates, production bucket privacy, WAF/bot controls, database backups, TLS termination, or hosting account MFA. Verify these in the target provider consoles without copying secrets into code or chat.

Automated tests and builds were not run as part of this review. `npm audit` is a dependency advisory check, not a runtime security test. No production credentials, database, or deployment were changed.
