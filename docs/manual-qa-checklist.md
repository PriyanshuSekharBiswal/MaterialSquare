# Material Square manual QA checklist

Use this checklist to review the customer storefront and admin workspace locally before a release. Keep this file open while testing and tick items as you go. Record any failure with the page, action, expected result, actual result, and a screenshot.

## Test environment

- Storefront: `http://localhost:5173/`
- CAPTCHA-compatible customer sign-in: `http://material-square.localtest.me:5173/account`
- Admin workspace: `http://localhost:5174/`
- API and database: local development services from the root `.env`
- Use local/test records only. A change made in localhost does not publish to Vercel.
- Do not use production customer data or publish/send a real customer message during a local review.
- Keep passwords, OTPs, CAPTCHA responses, and session cookies out of screenshots and notes.

Start the full local stack from the repository root with `npm run dev:all`. It starts the storefront, admin, and API. Confirm the API and local database are available if either workspace stays on a loading screen. Do not run database migrations against production while preparing a local test.

For real customer OTP sign-in, use the CAPTCHA-compatible hostname above, complete the CAPTCHA, and request one fresh OTP. The project README documents the required local MSG91 and CORS configuration. Plain `localhost` is not a supported CAPTCHA hostname. Admin sign-in uses the local staff account configured for this development database; do not assume production staff credentials are available locally.

## Storefront: browse and product details

- [ ] Home opens without a blank section or persistent loading state; header, navigation, hero scene, search, service area, and footer are visible.
- [ ] Header links open the correct pages; browser Back and Forward return to the expected page.
- [ ] Search suggestions appear for a known published product, brand, and category; choosing a suggestion opens the relevant result.
- [ ] Marketplace category, brand, availability, and text filters update the results and can be cleared.
- [ ] Each product card has a working click target. Open a product using its image, title, and primary action; each should reach that product’s own detail page.
- [ ] Product detail shows the matching name, brand, description, variant/options, availability, minimum order, and approved image when provided.
- [ ] Change variant and quantity; invalid values are rejected and the selected values remain visible.
- [ ] Add the item to the material list, change quantity, remove it, and confirm the list count and contents update.
- [ ] Refresh the page and confirm the material list persists for this browser as designed.
- [ ] Check office details, map controls, directions link, call link, WhatsApp link, and the floating material-list control.
- [ ] Check desktop and narrow/mobile widths for clipped controls, unusable menus, or horizontal overflow.

## Storefront: customer journey

Use a clearly labeled QA customer only. If you sign in, use the local phone/CAPTCHA/OTP setup described above.

- [ ] Open Account, enter a valid test phone, complete CAPTCHA, request OTP, and complete verification. Confirm the account page opens.
- [ ] Try an invalid phone and an incorrect/expired OTP; confirm a useful error appears and the page remains recoverable.
- [ ] Build a quote list with two different items, variants, and quantities. Verify the review shows the same choices.
- [ ] Complete the quote form with a QA name, phone, email, and delivery address. Review the complete message before submission.
- [ ] Submit only to the local API/test destination. Confirm a success reference appears and the request is visible in the local admin inbox.
- [ ] Open the customer account and confirm only that customer’s quotation/request appears.
- [ ] Review quotation, order, delivery, and purchase-history empty states or existing QA records; confirm links lead to the correct record.
- [ ] If testing WhatsApp handoff, inspect the composed message and destination first. Send only to an explicitly designated QA number, never a customer.

## Admin workspace: navigation and search

- [ ] Sign in at `http://localhost:5174/` with the local staff account.
- [ ] Open every visible navigation item: Overview, Quotations & orders, Business management, Operational reports, Products, prices & offers, Website pages & content, Staff & Roles, Audit log, and Notifications. Confirm each page loads records or a useful empty state.
- [ ] Use global search with a product name, customer name/phone, and a section keyword. Confirm suggestions are relevant, keyboard navigation works, and selecting a result opens the expected record or filtered view.
- [ ] Refresh each workspace page and use its refresh/filter/pagination controls where present. Confirm loading ends and failures show a retryable message.
- [ ] Use the workspace’s recent activity/audit views to find the expected actor, action, record, and time after a local change.

## Admin workspace: catalogue and media

Start with a local QA product draft; use a clearly identifiable name such as `QA LOCAL ONLY - <date>`. Use a client-approved image or a harmless local test image.

- [ ] Create a product draft with required brand/category, description, specifications, variant, colour/finish, availability, MOQ, and price fields.
- [ ] Upload an image and confirm a preview/thumbnail appears before saving. Remove or replace it and confirm the preview updates.
- [ ] Save as draft, navigate away, return, and confirm the saved values remain. Test autosave/recovery only if the screen indicates it has saved.
- [ ] Open draft preview. Compare image, title, price/reference-price treatment, options, availability, and description against the storefront product-card and detail-page layouts.
- [ ] Edit the draft and preview again. Confirm the private preview reflects edits and is marked unpublished.
- [ ] Publish only a local QA record. Confirm it appears in the local storefront and can be found through search; unpublish it and confirm it disappears from public results.
- [ ] After publishing, refresh the storefront before checking: an already-open storefront tab keeps its catalogue snapshot until it reloads.
- [ ] Check image upload errors with an unsupported/oversized file only if a safe fixture is available; confirm a clear error and no broken record.
- [ ] Exercise product search, status/brand/category/availability filters, sorting, pagination, edit, duplicate (if available), archive/delete confirmation, and export (if available). Keep the QA record until verification is complete.

## Admin workspace: content and storefront settings

- [ ] Edit a low-risk local draft setting (for example, a QA-only headline suffix), save draft, leave the page, and return. Confirm the draft remains.
- [ ] Preview the draft in the embedded customer-site preview. Confirm it is visibly marked unpublished and does not change the normal local storefront.
- [ ] Publish the local draft and confirm only the intended local storefront section changes. Revert the QA copy afterward.
- [ ] Check office/depot name, address, service area, and phone controls. Verify office details/map/directions reflect local published values after publishing.
- [ ] Check blog/article create, image preview, draft, preview, publish, edit, and archive flows using QA-only copy.
- [ ] Check policy/content pages and confirm unpublished privacy/terms drafts stay hidden from the public storefront.

## Admin workspace: sales and operations

- [ ] Open a local QA quotation from the inbox; inspect customer details and line items.
- [ ] Update status, assign an owner, add an internal note, prepare/edit a response, save as draft, preview, and publish only in local data.
- [ ] Verify the quote revision/history and audit entry identify the action and actor.
- [ ] Check follow-up scheduling, rescheduling, completion, and cancellation using a QA request and local notifications only.
- [ ] Check report date filters, summary totals, record links, and CSV/export output against the visible filtered rows.
- [ ] Check notification queue/status and detail views. Do not trigger a real webhook or customer notification during QA.
- [ ] If notification setup check fails, confirm the page identifies a missing/outdated API route or unreachable API and that Retry setup check recovers when the API becomes available.
- [ ] Review business settings such as offers, discounts, loyalty, suppliers, procurement, and delivery only with local QA records; confirm save, validation, audit, and recent-activity behavior.

## Admin workspace: staff, permissions, and recovery

- [ ] Create one disposable local staff account for each role you need to verify, using reserved test contact details.
- [ ] Sign in as each role in a separate browser profile and confirm allowed pages/actions work and restricted actions are hidden or rejected by the API.
- [ ] Change a test staff role, disable and re-enable the test account, and confirm the status and audit history update.
- [ ] Reset a test account password and confirm the prior password stops working and the new local password works.
- [ ] Confirm no role can change another account into an owner/super-admin unless that capability is explicitly intended.
- [ ] On draft forms, enter a distinctive unsaved value and use the page’s save-draft/recovery flow. Confirm the recovery notice shows the correct item and saved time. Do not simulate a power cut on a shared or production browser.
- [ ] Confirm drafts are private, expire according to the configured retention period, and can be restored or discarded deliberately.
- [ ] Filter the audit log by date/action/entity, open record details, and confirm passwords, OTPs, tokens, and other secrets are never recorded.
- [ ] Remove/disable disposable local test accounts and delete/archive QA records after checks are complete.

## Release pass

- [ ] Repeat the key storefront path: search → product detail → material list → quote review → local submission → admin inbox.
- [ ] Repeat the admin path: draft product → preview → publish locally → confirm in storefront → edit/unpublish.
- [ ] Confirm recent activity and audit entries appear for the local actions.
- [ ] Record environment and build/commit tested, date, pass/fail, and any screenshots with personal data removed.
- [ ] Only after local QA passes, review deployment diff and environment configuration separately. A local pass does not itself deploy changes or prove production behavior.
