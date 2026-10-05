# Staging preview operations

The Render service `material-square-demo-api` is reserved for the staging
branch. Database migrations run before the API starts. Product records are not
seeded; use only client-confirmed inventory in the admin catalogue. Unpublished
records do not appear in customer search.

## Temporary administrator for testing

When an authorized test administrator is needed, enable the optional preview
bootstrap in the staging service only. Configure
`PREVIEW_STAFF_BOOTSTRAP_ENABLED=true`, `PREVIEW_STAFF_PHONE`,
`PREVIEW_STAFF_NAME`, and the secret `PREVIEW_STAFF_PASSWORD`. The staging start
command can then run `npm run staff:bootstrap-preview` before starting the API.
The script upserts only the specified phone and refreshes its password and
super-admin role. It is disabled by default, and it is not part of the paid
production blueprint.

After testing, set `PREVIEW_STAFF_ACTION=remove` while leaving the bootstrap
enabled for one staging restart. The script removes only the specified phone.
Then disable the bootstrap and remove the temporary credential variables. The
staging account lifecycle does not remove customer contact, quote, order, or
other staff records.

## Staging health check

Production readiness at `/api/health/ready` requires production CORS and
S3-compatible product-image storage configuration. The current staging service
does not have image storage credentials, so its Render health check uses the
liveness endpoint `/api/health` to support catalogue and quote-flow testing.
For client production, configure approved storage and keep the paid blueprint's
readiness health check enabled.
