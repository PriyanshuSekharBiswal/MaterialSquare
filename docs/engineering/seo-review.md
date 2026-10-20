# SEO and AI-search review

Reviewed 19 October 2026 against the customer storefront routes, crawler handlers,
metadata component, sitemap controller, and Vercel routing configuration. This is
a source review; live crawl/index status and Core Web Vitals require production
Search Console and field data.

## Assessment

The technical SEO foundation is solid for a React storefront: the important
public routes receive server-generated HTML metadata and readable no-JavaScript
content; product, blog, catalogue, and contact routes have route-specific
canonical and social metadata; the site emits JSON-LD; the sitemap is generated
from published products, articles, experts, policies, and pages; and private,
filtered, empty, unpublished, unknown, and preview routes receive `noindex`
signals. Query-filtered marketplace pages canonicalize to the base catalogue.

This review found valid policy and FAQ routes that the sitemap could advertise
but the direct-request handler did not render. The handler returned a 404 for
`/faq`, `/shipping`, and `/return-policy`. It now serves crawlable fallbacks and
matching metadata for those paths, and the client metadata layer preserves the
FAQ schema after hydration. Empty/unpublished policy or FAQ content remains
out of the index.

## What the implementation covers

- Distinct titles and descriptions for the homepage, catalogue, products, blogs,
  contact, experts, service-area, legal, and managed pages.
- Canonical URLs without tracking/search/filter query strings on the catalogue.
- Open Graph and large-card metadata, `en-IN` document language, responsive
  viewport, image alternatives, and generated social images.
- `robots.txt`, sitemap generation, preview/noindex behavior, and `X-Robots-Tag`
  on private or error responses.
- JSON-LD for organization/site identity, products, articles, breadcrumbs,
  catalogue collections, FAQ content, and service-area page context.
- Server-rendered fallback text for important public routes so page content is
  available before the React application runs.

## Priorities and limits

1. **Publish accurate business identity.** Confirm the operating legal name,
   public phone/email, actual office or service address, and real service area.
   Keep the site, invoices, and Google Business Profile consistent. The schema
   intentionally uses `Organization` and `areaServed`; do not add a `LocalBusiness`
   address or map pin unless customers can visit that real location.
2. **Keep city pages non-indexable until they are genuinely distinct.** The
   service-area slug list currently has an empty indexable allowlist by design.
   To target Noida, Delhi, Gurugram, and nearby searches, first add verified
   delivery coverage, project examples, local FAQs, and useful location details
   for each city. Avoid publishing six near-identical pages.
3. **Set product structured-data expectations correctly.** Product JSON-LD has
   identity, brand, SKU, category, image, description, and specifications, but
   no `Offer`, public current price, review, or aggregate rating. The catalogue
   is a quotation channel and prices/stock are confirmed per site; do not invent
   fixed offers or reviews. Consequently, these pages are not currently eligible
   for Google merchant-listing experiences that require accurate offer data.
   Revisit only if the business exposes reliable, current transaction data.
4. **Improve source content before adding SEO machinery.** Product descriptions,
   technical specifications, useful buying guides, named article authors, and
   clear quotation/delivery explanations should be accurate and materially
   useful. Do not generate thin pages for every product term or city.
5. **Measure production results.** Verify the canonical domain, submit
   `/sitemap.xml` to Google Search Console and Bing Webmaster Tools, inspect
   representative home/catalogue/product/blog/legal URLs, validate JSON-LD, and
   monitor indexing, crawl errors, search queries, and field Core Web Vitals.
   Code inspection cannot confirm rankings, indexing, business-profile status,
   backlink quality, or actual user performance.

## GEO / generative-search guidance

If “GEO” means generative-engine optimization, there is no separate LLM feature
needed in this product. Google's current guidance says the same technical SEO,
indexability, useful text, internal linking, page experience, accurate business
profiles, and structured data that matches visible content apply to AI search;
there is no special AI schema or required `llms.txt`. Keep product facts,
coverage, and contact details explicit and verifiable. Do not add LLM-generated
content pipelines for ranking.

If “GEO” means local/geographic search, the site already models the NCR service
area, uses `en-IN`, and emits `areaServed` where actual coverage is configured.
The intentionally empty city-page index list means those city landing pages
will not rank until separately approved and populated with useful local content.

## External references

- [Google Search Central: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google Search Central: Product structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Google Search Central: Local business structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google Search Central: helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
