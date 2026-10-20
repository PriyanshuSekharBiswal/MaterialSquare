import type { IncomingMessage, ServerResponse } from "node:http";
import { customerProductDescription, customerProductTitle, customerSpecifications } from "../../catalogue/customer-display.js";
import { canonicalSiteOrigin, trustedSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { retainSharedStructuredData } from "./structured-data.js";
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
  specs?: Record<string, string | undefined>;
  features?: string[];
  applications?: string[];
  variants?: Array<{
    label: string;
    unit: string;
    attributes?: Record<string, string>;
  }>;
  image?: string | null;
  galleryImages?: string[];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function setMeta(html: string, kind: "name" | "property", key: string, value: string) {
  const expression = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

function removeMeta(html: string, property: string) {
  return html.replace(
    new RegExp(`<meta\\s+property=["']${property}["'][^>]*>\\s*`, "i"),
    "",
  );
}

function setTitle(html: string, title: string) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function renderProductNotFoundHtml(shell: string) {
  const title = "Product not found | Material Square";
  const description = "This product could not be found in the Material Square catalogue. Browse available construction materials or contact our team for help.";
  let html = shell.replace(/<script\s+id=["']ms-page-structured-data["'][\s\S]*?<\/script>/i, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  html = html.replace(/<meta\s+property=["']og:url["'][^>]*>\s*/gi, "");
  html = setTitle(html, title);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", "noindex, nofollow");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = html.replace(/<noscript><style>[\s\S]*?<\/style><\/noscript>/i, "");
  const fallback = `<noscript><style>.boot-loading{display:none!important}</style><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="/marketplace">Browse construction materials</a> · <a href="/contact">Contact Material Square</a></p></main></noscript>`;
  return html.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${fallback}`);
}

function publicImageUrl(value: string | null | undefined, origin: string) {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    // These bundled catalogue illustrations have matching WebP assets. Use
    // the smaller file for product metadata and structured data as well as the
    // client-rendered image, while leaving uploaded/external images untouched.
    if (
      url.origin === origin &&
      (/^\/images\/products\/[a-z0-9-]+-illustration\.png$/i.test(url.pathname) ||
        url.pathname === "/images/materials-editorial.png")
    ) {
      url.pathname = url.pathname.replace(/\.png$/i, ".webp");
    }
    return url.href;
  } catch {
    return null;
  }
}

function shortText(value: string, maximum = 180) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > maximum
    ? `${normalized.slice(0, maximum - 1).trimEnd()}…`
    : normalized;
}

function visibleDescription(product: PublicProduct, siteTitle: string) {
  const supplied = customerProductDescription(product.description);
  if (supplied) return shortText(supplied);
  const category = product.categoryLabel || product.category || "construction";
  return shortText(`${product.brand ? `${product.brand} ` : ""}${category} construction material. ${product.unit ? `Sold by ${product.unit}. ` : ""}Request a project quotation from ${siteTitle}.`);
}

function renderNoScriptProduct(product: PublicProduct) {
  const specifications = customerSpecifications(product.specs);
  const brandLabel = product.brand || "Marketplace";
  const brandHref = product.brand
    ? `/marketplace?brand=${encodeURIComponent(product.brand)}`
    : "/marketplace";
  const facts = [
    ...(product.code ? [`<dt>Product code</dt><dd>${escapeHtml(product.code)}</dd>`] : []),
    ...(product.unit ? [`<dt>Unit</dt><dd>${escapeHtml(product.unit)}</dd>`] : []),
    ...specifications.flatMap(([name, value]) => [
      `<dt>${escapeHtml(name)}</dt>`,
      `<dd>${escapeHtml(value)}</dd>`,
    ]),
  ];
  const variants = (product.variants || []).map((variant) => {
    const attributes = Object.entries(variant.attributes || {})
      .map(([name, value]) => `${escapeHtml(name)}: ${escapeHtml(value)}`)
      .join(" · ");
    return `<li>${escapeHtml(variant.label)}${attributes ? ` — ${attributes}` : ""}${variant.unit ? ` · ${escapeHtml(variant.unit)}` : ""}</li>`;
  }).join("");
  const description = customerProductDescription(product.description);
  const context = [product.brand, product.categoryLabel || product.category]
    .filter(Boolean)
    .map((value) => escapeHtml(value || ""))
    .join(" · ");
  const features = (product.features || []).map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  const applications = (product.applications || []).map((value) => `<li>${escapeHtml(value)}</li>`).join("");
  return `<noscript><main><nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="${brandHref}">${escapeHtml(brandLabel)}</a> › ${escapeHtml(product.name)}</nav><article>${context ? `<p>${context}</p>` : ""}<h1>${escapeHtml(product.name)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}${facts.length ? `<h2>Specifications</h2><dl>${facts.join("")}</dl>` : ""}${features ? `<h2>Product features</h2><ul>${features}</ul>` : ""}${applications ? `<h2>Applications</h2><ul>${applications}</ul>` : ""}${variants ? `<h2>Available product options</h2><ul>${variants}</ul>` : ""}<p>Request a quotation to confirm current pricing, availability and delivery for your project.</p><p><a href="/get-quote">Request a project quotation</a> · <a href="/marketplace">Browse construction materials</a></p></article></main></noscript>`;
}

export function renderProductHtml(shell: string, product: PublicProduct, origin: string, noIndex = false, siteTitle = "Material Square", content: Record<string, unknown> = {}) {
  const route = `/product/${encodeURIComponent(product.id)}`;
  const canonical = `${origin}${route}`;
  const title = customerProductTitle(product.name, product.brand, siteTitle);
  const description = visibleDescription(product, siteTitle);
  const productImage = product.image || product.galleryImages?.[0] || null;
  const productImageUrl = publicImageUrl(productImage, origin);
  const image = productImageUrl || `${origin}/social-card.png`;
  const imageAlt = productImageUrl
    ? product.name
    : "Material Square social card about construction materials, material lists and project quotations.";
  const factualDescription = customerProductDescription(product.description);
  const publicSpecifications = customerSpecifications(product.specs);
  // The shell has a homepage WebPage node; retain only the shared site entities.
  shell = retainSharedStructuredData(shell);
  shell = setSiteIdentityStructuredData(shell, origin, content);
  let html = setTitle(shell, title);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  html = setMeta(html, "property", "og:type", "website");
  html = setMeta(html, "property", "og:site_name", siteTitle);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:image", image);
  if (productImageUrl) {
    html = removeMeta(html, "og:image:type");
    html = removeMeta(html, "og:image:width");
    html = removeMeta(html, "og:image:height");
  }
  html = setMeta(html, "property", "og:image:alt", imageAlt);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setMeta(html, "name", "twitter:image", image);
  html = setMeta(html, "name", "twitter:image:alt", imageAlt);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${canonical}#product`,
        url: canonical,
        mainEntityOfPage: canonical,
        name: product.name,
        ...(factualDescription ? { description: shortText(factualDescription) } : {}),
        ...(product.code ? { sku: product.code } : {}),
        ...(product.categoryLabel || product.category ? { category: product.categoryLabel || product.category } : {}),
        ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
        ...(productImageUrl ? { image: [productImageUrl] } : {}),
        ...(publicSpecifications.length
          ? {
              additionalProperty: publicSpecifications.map(([name, value]) => ({
                "@type": "PropertyValue",
                name,
                value,
              })),
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          {
            "@type": "ListItem",
            position: 2,
            name: "Construction materials",
            item: `${origin}/marketplace`,
          },
          { "@type": "ListItem", position: 3, name: product.name, item: canonical },
        ],
      },
    ],
  };
  const script = `<script id="ms-product-structured-data" type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>`;
  html = html.replace(/<script id="ms-product-structured-data"[\s\S]*?<\/script>/i, "");
  // The homepage shell may already contain a canonical URL from the crawler
  // build. A product preview must have exactly one canonical, for this product.
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  html = html.replace("</head>", `  <noscript><style>.boot-loading{display:none!important}</style></noscript>\n  <link rel="canonical" href="${escapeHtml(canonical)}" />\n  ${script}\n</head>`);
  return html.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${renderNoScriptProduct(product)}`);
}

function getRequestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)?.split(",")[0]?.trim();
  return `${protocol === "http" ? "http" : "https"}://${host}`;
}

function respond(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(message);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end();
    return;
  }

  const requestOrigin = getRequestOrigin(req);
  const incoming = new URL(req.url || "/", requestOrigin || "https://invalid.local");
  let productId = "";
  try {
    productId = decodeURIComponent(incoming.searchParams.get("productId") || incoming.pathname.split("/").filter(Boolean).at(-1) || "");
  } catch {
    productId = "";
  }
  if (!requestOrigin || !/^[a-zA-Z0-9_-]{1,128}$/.test(productId)) {
    respond(res, 400, "Invalid product address");
    return;
  }
  if (!trustedSiteOrigin(requestOrigin)) {
    respond(res, 503, "Product preview is not configured");
    return;
  }
  const origin = canonicalSiteOrigin(requestOrigin);

  const configuredApiOrigin = process.env.API_ORIGIN?.trim() || "";
  let apiOrigin: URL;
  try {
    apiOrigin = new URL(configuredApiOrigin);
    if (apiOrigin.protocol !== "https:" || apiOrigin.username || apiOrigin.password || apiOrigin.pathname !== "/" || apiOrigin.search || apiOrigin.hash) {
      throw new Error("Invalid API origin");
    }
  } catch {
    respond(res, 503, "Product preview is unavailable");
    return;
  }

  try {
    const [shellResponse, productsResponse, contentResponse] = await Promise.all([
      fetch(`${origin}/__app-shell.html`, { signal: AbortSignal.timeout(8000) }),
      fetch(new URL("/api/products", apiOrigin), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(new URL("/api/site-content", apiOrigin), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    if (!shellResponse.ok) {
      respond(res, 502, "Customer website is unavailable");
      return;
    }
    if (!productsResponse.ok || !contentResponse.ok) {
      respond(res, 503, "Published products are temporarily unavailable");
      return;
    }
    const [products, content] = await Promise.all([
      productsResponse.json() as Promise<PublicProduct[]>,
      contentResponse.json() as Promise<Record<string, unknown>>,
    ]);
    const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
      ? content["seo.siteTitle"].trim()
      : "Material Square";
    const product = Array.isArray(products) ? products.find((item) => item.id === productId) : undefined;
    if (!product) {
      const notFound = renderProductNotFoundHtml(await shellResponse.text());
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      });
      res.end(req.method === "HEAD" ? undefined : notFound);
      return;
    }

    const isPreview = isPreviewDeployment();
    const html = renderProductHtml(await shellResponse.text(), product, origin, isPreview, siteTitle, content);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      ...(isPreview ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    respond(res, 503, "Product preview is temporarily unavailable");
  }
}
