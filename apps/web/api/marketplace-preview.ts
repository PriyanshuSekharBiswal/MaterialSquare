import type { IncomingMessage, ServerResponse } from "node:http";
import { publicFaqEntries, SEO_ROUTE_DESCRIPTIONS, type FaqEntry, type SiteContent } from "@material-square/types";
import { customerProductDescription } from "../src/catalogue/customer-display.js";
import { canonicalSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { setPageStructuredData } from "./structured-data.js";
import { setSocialCardMetadata } from "./social-metadata.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

type PublicProduct = {
  id: string;
  code?: string | null;
  name: string;
  brand?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  unit?: string | null;
  description?: string | null;
  image?: string | null;
  galleryImages?: string[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ]!,
  );
}

function setMeta(html: string, kind: "name" | "property", key: string, value: string) {
  const expression = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

function fallbackImageUrl(imageUrl: string, origin: string) {
  try {
    const image = new URL(imageUrl, origin);
    if (
      image.origin === origin &&
      (/^\/images\/products\/[a-z0-9-]+-illustration\.png$/i.test(image.pathname) ||
        image.pathname === "/images/materials-editorial.png")
    ) {
      image.pathname = image.pathname.replace(/\.png$/i, ".webp");
    }
    return image.href;
  } catch {
    return imageUrl;
  }
}

function withSchema(
  html: string,
  origin: string,
  products: PublicProduct[],
  title: string,
  faqEntries: FaqEntry[],
) {
  const canonical = `${origin}/marketplace`;
  const pageSchema = {
    "@type": "CollectionPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description: SEO_ROUTE_DESCRIPTIONS["/marketplace"],
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/product/${encodeURIComponent(product.id)}`,
        name: product.name,
      })),
    },
  };
  return setPageStructuredData(html, [
    pageSchema,
    ...(faqEntries.length
      ? [{
          "@type": "FAQPage",
          "@id": `${canonical}#faq`,
          mainEntity: faqEntries.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        }]
      : []),
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: "Construction materials",
          item: canonical,
        },
      ],
    },
  ]);
}

function renderProducts(products: PublicProduct[], origin: string) {
  if (!products.length) return "<p>No materials are currently published. Check back soon or contact the team about your project.</p>";
  const entries = products.map((product) => {
    const href = `/product/${encodeURIComponent(product.id)}`;
    const category = product.categoryLabel || product.category || "Construction material";
    const description = customerProductDescription(product.description);
    const image = product.image || product.galleryImages?.[0];
    let imageUrl = "";
    if (image) {
      try {
        const parsed = new URL(image, origin);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") imageUrl = parsed.href;
      } catch {
        imageUrl = "";
      }
    }
    const renderedImageUrl = imageUrl ? fallbackImageUrl(imageUrl, origin) : "";
    const hasKnownSquareDimensions = imageUrl
      ? new URL(imageUrl, origin).origin === origin &&
        /^\/images\/products\/[a-z0-9-]+-illustration\.png$/i.test(new URL(imageUrl, origin).pathname)
      : false;
    return `<article><a href="${href}">${renderedImageUrl ? `<img src="${escapeHtml(renderedImageUrl)}" alt="${escapeHtml(product.name)}"${hasKnownSquareDimensions ? ' width="1254" height="1254"' : ""} loading="lazy" decoding="async" />` : ""}<h2>${escapeHtml(product.name)}</h2></a><p>${escapeHtml([product.brand, category].filter(Boolean).join(" · "))}</p>${product.code ? `<p>Product code: ${escapeHtml(product.code)}</p>` : ""}${product.unit ? `<p>Unit: ${escapeHtml(product.unit)}</p>` : ""}${description ? `<p>${escapeHtml(description)}</p>` : ""}<p><a href="${href}">View product details</a></p></article>`;
  }).join("");
  return `<div class="seo-catalogue-list">${entries}</div>`;
}

function renderPage(shell: string, products: PublicProduct[], origin: string, noIndex: boolean, content: Record<string, unknown>, configuredTitle?: string, siteTitle = "Material Square") {
  const canonical = `${origin}/marketplace`;
  const title = configuredTitle?.trim() || "Construction Materials Catalogue | Material Square";
  const description = SEO_ROUTE_DESCRIPTIONS["/marketplace"];
  shell = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  shell = setMeta(shell, "name", "description", description);
  shell = setMeta(shell, "name", "robots", noIndex ? "noindex, follow" : "index, follow");
  shell = setMeta(shell, "property", "og:type", "website");
  shell = setMeta(shell, "property", "og:site_name", siteTitle);
  shell = setMeta(shell, "property", "og:title", title);
  shell = setMeta(shell, "property", "og:description", description);
  shell = setMeta(shell, "property", "og:url", canonical);
  shell = setMeta(shell, "name", "twitter:title", title);
  shell = setMeta(shell, "name", "twitter:description", description);
  shell = setSocialCardMetadata(shell, origin);
  shell = setSiteIdentityStructuredData(shell, origin, content);
  shell = shell.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  shell = shell.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);
  const faqEntries = publicFaqEntries(content as SiteContent);
  shell = withSchema(shell, origin, products, title, faqEntries);
  const faqSection = faqEntries.length
    ? `<section aria-labelledby="marketplace-faq-heading"><h2 id="marketplace-faq-heading">Frequently asked questions</h2>${faqEntries.map(({ question, answer }) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</section>`
    : "";
  const fallback = `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › Construction materials</nav><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${renderProducts(products, origin)}${faqSection}<nav aria-label="Explore more"><a href="/get-quote">Request a project quotation</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`;
  shell = shell.replace(/<noscript><main class="seo-static-fallback">[\s\S]*?<\/main><\/noscript>/i, "");
  return shell.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${fallback}`);
}

function requestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(",")[0]?.trim();
  return `${protocol === "http" && isPreviewDeployment() ? "http" : "https"}://${host}`;
}

function apiOrigin() {
  try {
    const url = new URL(process.env.API_ORIGIN?.trim() || "");
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end();
    return;
  }
  const incomingOrigin = requestOrigin(req);
  const api = apiOrigin();
  if (!incomingOrigin || !api) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    res.end(req.method === "HEAD" ? undefined : "Catalogue is temporarily unavailable");
    return;
  }
  const origin = canonicalSiteOrigin(incomingOrigin);
  const incomingUrl = new URL(req.url || "/", incomingOrigin);
  const filtered = ["q", "category", "brand"].some((key) => Boolean(incomingUrl.searchParams.get(key)?.trim()));
  const isPreview = isPreviewDeployment();

  try {
    const [shellResponse, productsResponse, contentResponse] = await Promise.all([
      fetch(`${incomingOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/products", api), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/site-content", api), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) }),
    ]);
    if (!shellResponse.ok || !productsResponse.ok || !contentResponse.ok) throw new Error("Catalogue content unavailable");
    const products = await productsResponse.json() as PublicProduct[];
    const content = await contentResponse.json() as Record<string, unknown>;
    if (!Array.isArray(products)) throw new Error("Invalid product response");
    const configuredTitle = typeof content["seo.marketplaceTitle"] === "string" ? content["seo.marketplaceTitle"] : undefined;
    const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
      ? content["seo.siteTitle"].trim()
      : "Material Square";
    const noIndex = filtered || isPreview || products.length === 0;
    const html = renderPage(await shellResponse.text(), products, origin, noIndex, content, configuredTitle, siteTitle);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      ...(noIndex ? { "X-Robots-Tag": "noindex, follow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    res.end(req.method === "HEAD" ? undefined : "Catalogue is temporarily unavailable");
  }
}
