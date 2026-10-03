# Client content review — Material Square

Review updated on 3 October 2026. The customer and staff frontends have been deployed to Vercel for testing, and the API is running on Render's free demo service. This is a test deployment, not the client's production environment. This review records business facts still awaiting client confirmation; it is not evidence that those facts are true. Existing brand logos, brand images and brand text have been preserved.

## Confirm before publication

The active V1 customer pages have been revised to remove unsupported named delivery stories and testimonials, response-time/statistical promises, guaranteed dispatch and authenticity claims, and the fabricated delivery schedule table. The homepage now shows material-group examples clearly marked as illustrative. Contact and Why Us pages describe the request-and-confirm workflow. The API seed now creates/backfills 22 editable preview product families with size/pack variants, with unverified technical claims removed and demo pricing clearly flagged. Older, unused components remain in the repository; do not reconnect them or restore removed case studies, guarantees, or partner claims without client evidence and approval.

| Item | Current website content / source | What the client must confirm |
|---|---|---|
| Identity and contact | `packages/types/src/catalog-data.ts`: Material Square, 9773505015, orders@materialsquare.in, @materialsquare.in | Legal/trading name, ownership of phone/WhatsApp/email/social account and correct recipient |
| Office | `packages/types/src/catalog-data.ts`: Plot 42, Mohan Nagar Link Road, Industrial Area, Ghaziabad 201007, coordinates 28.6791, 77.382 | Actual office/depot address, map point and permission to show it publicly |
| Service coverage | Header and data list six NCR cities | Supported PIN codes, delivery restrictions and who confirms out-of-area requests |
| Working hours | A legacy data entry says Mon–Sat 8 AM–8 PM and emergency dispatch; this is not shown as a live V1 promise | Actual staffed contact hours. Remove the emergency claim unless the client confirms it |
| Delivery promises | Current V1 pages say staff confirms delivery availability, timing and site charges for each request. Older unused catalogue data contains dispatch promises | Confirm any delivery commitment the client wants published and the conditions for stock, payment, location and scheduling |
| Response promise, fleet and social proof | Older unused data/components contain response-time, GPS, customer-count and case-study claims; these are not active V1 claims | Keep removed unless the client supplies evidence and expressly approves publication |
| Manufacturer relationships | The brand directory preserves existing manufacturer names, logos and taglines | Confirm which brands the client is authorized to sell and what supporting documents can be supplied. Do not treat a directory entry as proof of authorization |
| Availability and minimum order | The preview catalogue now seeds 22 product families with pack/size variants. Sample stock is zero/unconfirmed so it cannot be mistaken for live inventory; material-list requests remain available | Accurate stock quantities and minimum orders for every sellable variant. Inventory is manually managed and not synced from another system |
| Prices and offers | Preview variants carry clearly labelled indicative rates, including sample rates from the provided quotation, a user screenshot reference, and manufacturer MRP references. Other category prices/discount comparisons are rough demo data, not client-approved offers | Replace every demo estimate with the approved price for each exact unit/pack, confirm GST and delivery wording, and enter any real offer label and start/end dates. Offers follow the entered dates in India Standard Time; price and stock are not synced from another system |
| Website analytics | V1 records daily aggregate page views, product-detail opens, add-to-list actions and WhatsApp/email link clicks without visitor IDs, IP addresses or search text | Approve a privacy notice describing first-party aggregate analytics and choose the retention period. Traffic sources and unique-visitor counts are not collected |
| Technical product details | The preview seed now removes unverified numeric claims from its public specifications. Sizes and packs shown as variants are illustrative catalogue options and must be checked against actual stock | Manufacturer datasheet for each actual SKU; staff must verify nominal sizing and units rather than infer them from illustrations |
| Guides/calculators | Engineering guides, wire selection, plumbing and storage examples | The page labels examples as unverified and requires professional review. A qualified electrical/plumbing professional must validate every value, rule, assumption and recommendation before these guides are promoted as advice |
| Product images | `apps/web/public/images/products/`: generated representative illustrations | Accept illustrations for launch or supply approved manufacturer images; images do not certify model, packaging, size, color availability or performance |
| Delivery/site photographs | Existing homepage delivery carousel and other brand/site images | Ownership/permission and whether these actually depict the business's work |

## Policy information still needed

Draft customer-facing pages now exist at `/privacy` and `/terms` and are linked from the footer. They describe the V1 account, analytics, and external WhatsApp/email handoff. They are marked as drafts and must not be published as approved policy. Provide the business's responsible contact for privacy/account requests, approved data-retention period, and process for account deletion/correction. Self-service account deletion is not implemented. Confirm how staff handles customer details received through WhatsApp/email. The account stores mobile, profile details and saved materials; the website does not automatically retain external message histories or quotations. A 30-day login cookie is used. V1 analytics stores only aggregate page/product/action counts; client approval of its privacy notice and retention period is still required.

Provide approved quotation validity/payment/returns/cancellation terms if these are to be published. This release has no website checkout or payment collection. Do not imply that a material request creates a confirmed order.

Privacy and website terms pages should be finalized using these facts before launch; this review does not invent a policy or represent legal approval.

## Release scope already agreed

Browse → save material list → OTP account → review customer/site details → preview message → open WhatsApp/email → customer presses Send → staff continues there. The website does not claim a message was delivered merely because an app opened. Provider activation, real OTP delivery, production hosting and the business confirmations above remain launch prerequisites.

## Approval record

For each row, record: confirmed/revise/remove, corrected value, supporting document where relevant, approving client representative and date. No client approval has yet been recorded in this file.
