# Production readiness checklist

Use this checklist to collect business approvals and setup details. Do not send passwords, provider Authkeys, database URLs, or other secrets in email or chat. Add secrets directly in the hosting provider's private settings.

## 1. Business identity and customer contact

- Legal business name and public trading name.
- Owner/contact person's name and role.
- Customer support phone number and WhatsApp number, including country code.
- Customer support email address.
- Office/depot address and map location.
- Confirmed service cities and supported PIN codes.
- Working days and support hours.
- Confirm who receives WhatsApp and email requests, and who responds to them.

## 2. Product catalogue and pricing

Provide one approved row per product or sellable pack. Do not combine different sizes or units into one row.

The production database starts with an empty catalogue. The 22 illustrative listings on the demo site are test-only and are not copied into production. Client staff must create each approved product and sellable variant, verify its product facts and image, enter its price and stock status, and publish it before customers can see it.

| Field                     | What to provide                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Product code / SKU        | The client's internal product identifier, if used                                             |
| Product name              | Customer-facing product name                                                                  |
| Brand                     | Exact manufacturer and brand spelling                                                         |
| Category                  | The website category                                                                          |
| Sellable unit / pack      | Examples: 50 kg bag, 3 m length, 1 piece                                                      |
| Selling price (INR)       | Price for exactly one stated unit/pack                                                        |
| Original/list price (INR) | Optional; only if the comparison price is genuine and approved                                |
| GST wording               | Included, extra, or the exact approved note                                                   |
| Offer label               | Optional customer-facing wording                                                              |
| Offer start and end dates | Optional. Scheduled offers become visible and expire automatically using India Standard Time. |
| Stock status              | In stock or unavailable; this is manually maintained, not synced to inventory                 |
| Minimum order             | Exact quantity and unit                                                                       |
| Product details           | Approved description, specifications, features and applications                               |
| Image                     | Approved image file or public HTTPS image URL, with rights to use it                          |

Confirm who is responsible for updating prices, stock and offer dates. The admin panel can upload PNG, JPEG and WebP images up to 5 MB after object storage is configured. Product images must not replace or alter brand logos or brand artwork.

## 3. Website content and claims

Review and approve or correct the existing content about delivery times, response times, authorized brand relationships, certificates, customer counts, fleet tracking, stock and product specifications. Remove any claim the client cannot support. Review the outstanding items in [Content Review](../content/review-checklist.md).

Approve the product illustrations already on the site, or provide approved manufacturer/product images. Illustrations do not prove a specific SKU's dimensions, packaging, stock or performance.

## 4. Policies and customer data

- Review the draft privacy notice and website terms at `/privacy` and `/terms`; confirm the legal business identity, public contact details, customer-data retention, and account correction/deletion process before launch. Both pages are visibly marked as drafts until approved.
- Name the business contact who will handle privacy, correction and account-deletion requests. Customer accounts currently have sign-out but no self-service account deletion; define and test the staff process before publishing a deletion promise.
- Customer account and saved-list retention period.
- Process for deleting or correcting customer account data.
- Who in the client's team may access customer profiles and saved material lists.
- Confirm staff will continue quotation discussions in WhatsApp/email; the initial-release site prepares the message but cannot confirm that it was sent or delivered.

## 5. Owner and staff access

- Initial owner/Super Admin name and 10-digit Indian mobile number.
- A temporary owner password of at least 12 characters, entered privately during setup and shared securely with the owner.
- Staff names, sign-in mobile number or email, and one role per person: Administrator, Sales & Customer Support, Catalogue & Pricing Manager, Website Content Manager, Procurement Head, Dispatch Officer, or Accounts Manager. The owner has the separate Super Admin role. The website editor manages approved page text, contact details and homepage hero image; other page-layout changes remain code changes.
- Name a second trusted owner for emergency access and password recovery.

Never put account passwords in this document.

## 6. Business rules to approve

Confirm these policies with the client and enter the approved settings before
staff relies on them in production:

- **Discounts:** eligible delivery areas, quantity thresholds, discount amounts,
  and whether rules can be combined. The admin supports configurable discount
  rules; approval of the rule values remains a business decision.
- **Quotations and follow-ups:** confirm the quotation validity period and
  expiry reminder timing. Existing defaults are 48 hours and a 24-hour reminder;
  staff can change validity and independently enable publication and expiry
  notifications. Agree the team's manual follow-up schedule.
- **Supplier rating:** confirm the five current 1-to-5 dimensions—price,
  delivery, availability, quality, and service—and whether they should have
  equal weight. Supplier matching currently averages the recorded scores after
  delivery-PIN and city matches.
- **Commission records:** confirm who is eligible, how the amount is calculated,
  and who may approve a record. The application records and approves commissions;
  it does not manage payouts or payment status.
- **Loyalty:** confirm qualifying purchases, points earned, redemption value and
  minimum, and point expiry. Configure the approved values in Loyalty settings.
- **Transportation:** confirm the client's permitted dispatch states and which
  delivery-plan and challan details staff must record. The application enforces
  its implemented state transitions and per-material partial receipt limits.
- **Notifications:** confirm which publication and expiry notifications are
  enabled and which approved provider or manual process handles customer
  contact. WhatsApp and email request handoffs are prepared for staff/customer
  communication; the website does not report that an external message was sent.

## 7. Hosting and provider setup

- Domain name and DNS-provider access, preferably by inviting the deployment operator rather than sharing the account password.
- Vercel access to the customer and admin projects.
- A hosting plan whose terms permit a commercial client website. Vercel Hobby is limited to personal, non-commercial use; choose Vercel Pro or another commercial-permitted host for production. The current Vercel deployments are for testing only. See [Vercel plan terms](https://vercel.com/docs/plans/hobby).
- Approval for persistent production API/PostgreSQL hosting and the monthly budget. Free Render Postgres expires after 30 days and is not suitable for client data.
- MSG91 OTP Widget ID and client token for the customer Vercel project; configure the private Authkey only on the API host. Set SMS as the widget's primary channel and disable Voice (the initial send follows the widget configuration; code can only force SMS for retries). Confirm the approved OTP template and any required Indian DLT/sender setup. Rotate any Authkey previously shared in chat.
- S3-compatible image-storage provider, bucket, region/endpoint, private read/list/write credentials, and public read-only/CDN URL for catalogue and content images. Before launch, run `npm run media:backfill` with these private values to review a read-only inventory of existing PNG/JPEG/WebP objects under `images/`; rerun with `npm run media:backfill -- --apply` only after the inventory is expected. This indexes the objects for staff search and usage checks and does not modify the bucket.
- Exact customer and admin HTTPS origins for the API CORS allowlist.
- Set `VITE_PUBLIC_SITE_URL` to the production customer-site origin in the customer-site build environment so server-rendered canonical and crawler metadata use the live domain.
- Independent encrypted backup destination, retention period and person responsible for restore tests.
- Uptime monitoring contact and alert recipient.

## 8. Website analytics and privacy approval

The initial release includes first-party daily aggregate counts for page views, product-detail opens, add-to-list actions, and WhatsApp/email link clicks. It does not store visitor IDs, IP addresses, search text, customer contact details, unique-visitor estimates, or traffic sources, and it does not require a third-party analytics account. The client must approve wording for this collection in the privacy notice and decide how long aggregate analytics should be retained. If source attribution or unique visitors are later required, select an analytics provider and approve its consent, privacy and retention setup as separate scope.

## 9. Initial release acceptance checks

After the production settings and approvals are in place, the client should verify:

1. Public product browsing works without signing in.
2. OTP arrives by SMS; the same customer can sign in on another device and see the saved material list.
3. A different mobile number sees a separate account; logout ends only that device's session.
4. Owner can create staff accounts, assign only approved roles, disable access and reset staff passwords.
5. Staff can create/edit products, upload an approved image, set price/tax note/offer/stock, publish and unpublish; changes appear on the website.
6. Website Content Manager can edit and publish the supported page text, business contact details and optional homepage hero image; saved content appears on the customer site after refresh.
7. Customer/site details and selected products appear in the WhatsApp or email preview; the customer presses Send in that app.
8. Page views, product views, material-list additions, and request handoffs appear in the staff dashboard without visitor identity or search text.
9. Database backups, restore procedure and uptime alerts are verified.

The [initial release requirements](../product/requirements.md) include customer
quotations and order history, internal supplier procurement, purchase orders,
transportation, blogs, commission calculations/approvals, and loyalty. Website
payment collection, payment-status controls, and commission payouts are excluded.
