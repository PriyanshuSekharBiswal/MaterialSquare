# Testing the demo

Run `npm run demo` from the repository root. This Mac needs Node, npm and PostgreSQL command-line tools (already present on the development machine). The command creates a dedicated local PostgreSQL cluster in `.local/demo-postgres`, applies migrations, prepares the demo staff account and starts the API. It starts the website and staff app, or reuses their existing development servers on ports 5173 and 5174.

Open `.local/demo-access.md` for the current URLs and local demo credentials. On this computer, the website is `http://localhost:5173/account` and staff app is `http://localhost:5174`. A phone must use the computer's Wi-Fi IP address, not localhost. Both devices must be on the same network; allow the Node server through the Mac firewall if prompted. The computer and demo process must remain running. This is not an internet deployment.

## Customer checks

1. On device A, select `9000000001` and press Send OTP. Read the six-digit demo code displayed on that page or press Use demo code. Verify, then complete the profile.
2. Add materials, sizes and quantities. Wait for saving to finish.
3. On device B, select the same number and request a new code. Codes expire after five minutes, are single-use, and a new request replaces the old code. Demo requests have a five-second cooldown.
4. Confirm that the same profile and saved list appear. Saved list changes refresh on return to a tab and approximately every 15 seconds while idle. Concurrent edits are rejected with a reload prompt instead of silently overwriting another device.
5. Sign in with `9000000002` on a separate browser or after logout. It has a separate account and list. `9000000003` is also available.
6. Log out on one device: the other device stays signed in. Refresh the logged-in page to check its session persists.

Only the configured demo numbers can request displayed OTPs. Demo account records are explicitly marked in the database. Disabling demo authentication rejects their sessions and staff credentials, even if a cookie/token has not expired. They do not become verified production customer accounts.

## Staff checks

Local demo mobile: `9000000000`. Local demo password: `MaterialDemo@2026` (also stored in ignored `.env.demo`). The seed script only runs with both demo flags and refuses to overwrite a non-demo staff account. These credentials are only for this demo.

Sign in, inspect Customers, open an account and review its saved material list. Record an enquiry received by WhatsApp, email or phone, add notes/materials and update its follow-up status. Reload the staff app to confirm the record and login remain available in the same browser tab. Staff sign-in lasts up to eight hours; signing out clears the tab session.

The first-release workspace shows customer accounts and manually recorded follow-ups. It does not import WhatsApp/email conversations. The earlier quotation/order UI is retained in `apps/admin/src/LegacyOperations.tsx` for later development and is not part of the current staff navigation.

## Data and stopping

`.local/` and `.env.demo` are ignored by Git. The local database listens only on 127.0.0.1:55440; phones connect through the API, not directly to PostgreSQL. It uses local trust authentication and is for local demo data only. Do not expose this database port to your network.

Ctrl+C stops servers started by the demo command. Previously running web/admin servers are not stopped. Data remains on disk. Stop the demo database separately with `pg_ctl -D .local/demo-postgres stop -m fast` when no longer needed. Do not delete that directory if you want to keep the saved demo accounts.

## Moving to real authentication

Use a separate production database, `APP_ENV=production`, and `DEMO_AUTH_ENABLED=false`. Create a staff account with `scripts/create-staff.cjs` using STAFF_PHONE, STAFF_EMAIL, STAFF_NAME and a private STAFF_PASSWORD. Integrate the actual OTP provider before enabling customer access. The demo flag is never a fallback for delivery errors.

Hosted setup is described in `deployment/vercel-render.md`. Real phone OTP delivery remains deferred; this demo does not verify ownership of a real mobile number.
