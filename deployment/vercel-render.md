# Vercel and Render deployment

This deployment uses the public customer website, a customer account portal, a separate protected admin workspace, a NestJS API, and a private PostgreSQL database. Visitors can browse and build a guest material list without signing in. MSG91 phone/OTP verification is used for customer accounts; client administrators and staff use the separate protected admin workspace.

## Vercel customer website

Connect the repository to Vercel and set the root directory to `apps/web`. Enable inclusion of files outside the root directory so npm workspaces can use the shared package and root lockfile. Use Node 22. The app-specific `vercel.json` supplies build/output and SPA navigation settings.

Set server-side `API_ORIGIN` to the API service HTTPS origin, for example `https://material-square-api.onrender.com` (without `/api`). Leave `VITE_API_URL` unset so browser requests use the same-origin `/api` proxy. Set `VITE_PUBLIC_SITE_URL` to the final customer website HTTPS origin for canonical and crawler metadata. Redeploy after changing variables.

Set `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_TOKEN_AUTH` on the customer-site project only after the client has configured the MSG91 widget and allowed origins. Set `MSG91_AUTHKEY` as a server-only API environment variable. Never expose the auth key through a `VITE_` variable. Until all three values are verified against the production domains, the account screen keeps OTP sign-in unavailable; guest browsing and material lists remain usable.

Use a hosting plan whose terms permit commercial use. Confirm hosting costs with the client. Assign the approved customer domain and configure DNS before launch.

Deploy `apps/admin` as a second private Vercel project on an approved admin host, or serve its static build at `/admin/` through the self-hosted Caddy gateway. Set `VITE_CUSTOMER_APP_URL` in the admin build and `VITE_ADMIN_APP_ORIGIN` in the customer build so private draft previews can exchange content only with the paired site origin. When using a separate host, set the API origin in `VITE_API_URL` and include both the storefront and admin origins in API `CORS_ORIGINS`.

## API and database

Create a Render Blueprint from root `render.yaml`; it creates paid resources. The API build applies committed migrations before startup. Configure `CORS_ORIGINS` with the exact customer-site HTTPS origin and keep database access private. The readiness check requires database connectivity, valid HTTPS website origins, and complete S3-compatible image storage settings.

Set `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_S3_PUBLIC_URL` on the API service. Set `AWS_S3_ENDPOINT` for providers such as R2 or MinIO; leave it blank for AWS S3. The public URL should serve catalogue images while write credentials remain private.

Apply migrations in each target environment with the provider's deployment process. Migrations `202610050004_remove_account_signin` and `202610050007_remove_customer_auth_state` retire customer sign-in state while preserving customer contacts and linked quote/order history. Existing staff accounts are preserved; `202610050006_restore_staff_access` ensures staff password storage exists on older schemas. Remove temporary developer staff records separately before client handover. The last verified staging migration status was through `202610050009_clear_unapproved_public_details`; migrations `202610050010_customer_portal_sessions` through `202610050012_unpublish_unapproved_catalogue` still need staging verification and, if pending, deployment. Do not treat the current public preview as client-ready until its migration status and public catalogue have been rechecked. Client production remains separate and has not been configured.

The Render API pre-deploy step applies database migrations only. No sample products are added automatically. Enter only client-confirmed products, shades, sizes, images, prices, offers, stock, and MOQs in the admin catalogue, then publish after review.

## Before client launch

Confirm customer and admin domains, business content, catalogue data, policies, client-approved product imagery, database backup and restore process, and hosting budget. Verify `/api/health/ready`, HTTPS, admin/staff roles, customer OTP and account ownership, product search and detail pages, guest quote-list behavior, quote submission handoff, and WhatsApp/email contact on the production domains. No online payment gateway is part of this website flow; any cash/bank/offline payment handling remains outside checkout and is coordinated directly by the client.
