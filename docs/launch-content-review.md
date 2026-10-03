# Client content review — Material Square

Review prepared from the current repository on 2 October 2026. This records unresolved business facts; it is not evidence that the claims are true. Existing brand logos, brand images and brand text have been preserved. The website has not been deployed.

## Confirm before publication

The V1 customer pages have been revised to remove the unsupported named delivery stories and testimonials, response-time/statistical promises, guaranteed dispatch and authenticity claims, and the fabricated delivery schedule table. The homepage now shows material-group examples clearly marked as illustrative. Contact and Why Us pages describe the request-and-confirm workflow. Do not restore removed case studies, guarantees, or partner claims without client evidence and approval.

| Item | Current website content / source | What the client must confirm |
|---|---|---|
| Identity and contact | `packages/types/src/catalog-data.ts`: Material Square, 9773505015, orders@materialsquare.in, @materialsquare.in | Legal/trading name, ownership of phone/WhatsApp/email/social account and correct recipient |
| Office | `packages/types/src/catalog-data.ts`: Plot 42, Mohan Nagar Link Road, Industrial Area, Ghaziabad 201007, coordinates 28.6791, 77.382 | Actual office/depot address, map point and permission to show it publicly |
| Service coverage | Header, contact page and data: six NCR cities | Supported PIN codes, delivery restrictions and who confirms out-of-area requests |
| Working hours | Data: Mon–Sat 8 AM–8 PM, emergency dispatch | Actual staffing and contact hours |
| Delivery promises | `ContactPage.tsx`: 2–4 hours, same-day and morning slots; product data same-day dispatch | Which promises can be honored and under what stock, payment, location and scheduling conditions |
| Response promise | Contact page: average response under 10 minutes | Evidence or replacement wording approved by the client |
| Fleet/tracking | Contact page and material data: GPS-tracked fleet and live GPS dispatch tracking | Whether the BUSINESS provides tracking through its operations. The WEBSITE does not currently provide a live tracking portal |
| Social proof | Contact page: 10k+ builders; Why Us: up to 14 days lost per project | Evidence/source or approved removal/replacement |
| Manufacturer relationships | Home/footer/product pages: authorized supply, manufacturer billing and certificates | Which brands authorize the business and what documents can be supplied |
| Availability and minimum order | New production database seeds the current catalogue as unavailable drafts | Accurate stock policy and product-specific minimum orders. Staff must verify and publish each listing; inventory is not synced from another system |
| Prices and offers | V1 staff catalogue editor supports selling price, optional original price, offer label and a price/tax note | Approved price per exact unit/pack, whether GST is included, delivery/other charge wording, offer label and its start/end dates. Offers follow the entered dates in India Standard Time; price and stock are not synced from another system |
| Website analytics | V1 records daily aggregate page views, product-detail opens, add-to-list actions and WhatsApp/email link clicks without visitor IDs, IP addresses or search text | Approve a privacy notice describing first-party aggregate analytics and choose the retention period. Traffic sources and unique-visitor counts are not collected |
| Technical product details | `packages/types/src/catalog-data.ts`: strength, pressure, temperatures, standards, grade, sizes and paired metric/inch pipe labels | Manufacturer datasheet for each actual SKU; staff must verify nominal sizing and units rather than infer them from illustrations |
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
