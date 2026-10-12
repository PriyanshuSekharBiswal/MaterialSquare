import type { IncomingMessage, ServerResponse } from "node:http";
import {
  SEO_INDEXABLE_SERVICE_AREA_SLUGS,
  SEO_SERVICE_AREA_PAGES,
  SEO_ROUTE_DESCRIPTIONS,
  serviceAreaSlugs,
} from "@material-square/types";
import { canonicalSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { setPageStructuredData } from "./structured-data.js";
import { setSocialCardMetadata } from "./social-metadata.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ]!,
  );
}

function brief(value: string, maximum = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximum) return normalized;
  const shortened = normalized.slice(0, maximum - 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || normalized.slice(0, maximum - 1).trim()}…`;
}

function setMeta(
  html: string,
  kind: "name" | "property",
  key: string,
  value: string,
) {
  const expression = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

function configureCanonical(html: string, canonical: string) {
  html = setMeta(html, "property", "og:url", canonical);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  return html.replace(
    "</head>",
    `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`,
  );
}

function activePageSchema(
  html: string,
  canonical: string,
  areaName: string,
  description: string,
) {
  const origin = new URL(canonical).origin;
  return setPageStructuredData(html, [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: `Construction materials in ${areaName}`,
      description,
      about: { "@type": "City", name: areaName },
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
        { "@type": "ListItem", position: 3, name: areaName, item: canonical },
      ],
    },
  ]);
}

function renderLocationPage(
  shell: string,
  area: (typeof SEO_SERVICE_AREA_PAGES)[number],
  origin: string,
  siteTitle: string,
  covered: boolean,
  indexable: boolean,
  content: Record<string, unknown>,
) {
  const route = `/locations/${area.slug}`;
  const canonical = `${origin}${route}`;
  const title = covered
    ? `Construction materials in ${area.name} | ${siteTitle}`
    : `Check material delivery in ${area.name} | ${siteTitle}`;
  const pageDescription = covered
    ? SEO_ROUTE_DESCRIPTIONS[route] || area.description
    : `Check material delivery coverage for ${area.name}. Share your site PIN code so the team can confirm whether products and delivery are available.`;
  const description = brief(pageDescription);
  shell = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  shell = setMeta(shell, "name", "description", description);
  shell = setMeta(
    shell,
    "name",
    "robots",
    indexable ? "index, follow" : "noindex, nofollow",
  );
  shell = setMeta(shell, "property", "og:type", "website");
  shell = setMeta(shell, "property", "og:site_name", siteTitle);
  shell = setMeta(shell, "property", "og:title", title);
  shell = setMeta(shell, "property", "og:description", description);
  shell = setMeta(shell, "name", "twitter:title", title);
  shell = setMeta(shell, "name", "twitter:description", description);
  shell = setSocialCardMetadata(shell, origin);
  shell = setSiteIdentityStructuredData(shell, origin, content);
  shell = configureCanonical(shell, canonical);
  if (indexable) {
    shell = activePageSchema(shell, canonical, area.name, description);
  } else {
    shell = shell.replace(
      /<script\s+id=["']ms-page-structured-data["'][\s\S]*?<\/script>/i,
      "",
    );
  }

  const fallback = covered
    ? `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/marketplace">Construction materials</a> › ${escapeHtml(area.name)}</nav><h1>Construction materials in ${escapeHtml(area.name)}</h1><p>${escapeHtml(area.description)}</p><p>Product availability, current prices, taxes and delivery are confirmed for the exact site PIN code, products and quantities in your enquiry.</p><nav aria-label="Project enquiry"><a href="/marketplace">Browse materials</a><a href="/get-quote">Request a project quote</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`
    : `<noscript><main class="seo-static-fallback"><h1>Check material delivery for ${escapeHtml(area.name)}</h1><p>${escapeHtml(description)}</p><p><a href="/contact">Contact Material Square</a></p></main></noscript>`;
  shell = shell.replace(
    /<noscript><main class="seo-static-fallback">[\s\S]*?<\/main><\/noscript>/i,
    "",
  );
  return shell.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${fallback}`);
}

function getRequestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (
    Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol
  )
    ?.split(",")[0]
    ?.trim();
  return `${protocol === "http" && isPreviewDeployment() ? "http" : "https"}://${host}`;
}

function configuredApiOrigin() {
  try {
    const api = new URL(process.env.API_ORIGIN?.trim() || "");
    if (
      api.protocol !== "https:" ||
      api.username ||
      api.password ||
      api.pathname !== "/" ||
      api.search ||
      api.hash
    )
      return null;
    return api;
  } catch {
    return null;
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end();
    return;
  }
  const requestOrigin = getRequestOrigin(req);
  const apiOrigin = configuredApiOrigin();
  const slug = new URL(req.url || "/", "https://internal.invalid")
    .searchParams.get("slug") || "";
  const area = SEO_SERVICE_AREA_PAGES.find((candidate) => candidate.slug === slug);
  if (!requestOrigin || !apiOrigin || !area) {
    res.writeHead(area ? 503 : 404, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Location page is unavailable");
    return;
  }

  try {
    const [shellResponse, contentResponse] = await Promise.all([
      fetch(`${requestOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/site-content", apiOrigin), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      }),
    ]);
    if (!shellResponse.ok || !contentResponse.ok) {
      throw new Error("Location page content is temporarily unavailable");
    }
    const content = (await contentResponse.json()) as Record<string, unknown>;
    const serviceArea = typeof content["contact.location"] === "string"
      ? content["contact.location"]
      : "";
    const covered = serviceAreaSlugs(serviceArea).includes(area.slug);
    const indexable = covered && SEO_INDEXABLE_SERVICE_AREA_SLUGS.includes(area.slug);
    const html = renderLocationPage(
      await shellResponse.text(),
      area,
      canonicalSiteOrigin(requestOrigin),
      typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
        ? content["seo.siteTitle"].trim()
        : "Material Square",
      covered,
      indexable,
      content,
    );
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      ...(!indexable || isPreviewDeployment()
        ? { "X-Robots-Tag": "noindex, nofollow" }
        : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Location page is temporarily unavailable");
  }
}
