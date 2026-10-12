import type { IncomingMessage, ServerResponse } from "node:http";
import { SEO_ROUTE_DESCRIPTIONS } from "./runtime-types.js";
import { canonicalSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { setPageStructuredData } from "./structured-data.js";
import { setSocialCardMetadata } from "./social-metadata.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

type PublicExpert = {
  id: string;
  name: string;
  serviceType: string;
  expertise: string;
  city?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  phone?: string | null;
  email?: string | null;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function setMeta(html: string, kind: "name" | "property", key: string, value: string) {
  const matcher = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return matcher.test(html)
    ? html.replace(matcher, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

function contactLinks(expert: PublicExpert) {
  return [
    ...(expert.email ? [`<a href="mailto:${escapeHtml(expert.email)}">Email provider</a>`] : []),
    ...(expert.phone ? [`<a href="tel:+91${escapeHtml(expert.phone)}">Contact provider</a>`] : []),
  ].join(" · ");
}

function publicImageUrl(value: string | null | undefined, origin: string) {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderExpertIndex(
  shell: string,
  experts: PublicExpert[],
  origin: string,
  noIndex: boolean,
  content: Record<string, unknown>,
  configuredTitle?: string,
  siteTitle = "Material Square",
) {
  const canonical = `${origin}/experts`;
  const title = configuredTitle?.trim() || "Experts and Services | Material Square";
  const description = SEO_ROUTE_DESCRIPTIONS["/experts"];
  const entries = experts.map((expert) => {
    const image = publicImageUrl(expert.imageUrl, origin);
    const imageAlt = `${expert.name}${expert.serviceType ? ` — ${expert.serviceType}` : ""}`;
    return `<article>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(imageAlt)}" loading="lazy" decoding="async" />` : ""}<h2>${escapeHtml(expert.name)}</h2><p>${escapeHtml([expert.serviceType, expert.city].filter(Boolean).join(" · "))}</p><p><strong>${escapeHtml(expert.expertise)}</strong></p>${expert.description ? `<p>${escapeHtml(expert.description)}</p>` : ""}<p>${contactLinks(expert)}</p></article>`;
  }).join("");
  const fallback = `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › Experts and services</nav><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${entries || "<p>No providers are currently listed. Contact the team to ask about project support.</p>"}<nav aria-label="Explore more"><a href="/marketplace">Browse materials</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`;
  shell = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  shell = setMeta(shell, "name", "description", description);
  shell = setMeta(shell, "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
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
  shell = setPageStructuredData(shell, [
    {
      "@type": experts.length ? "CollectionPage" : "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      ...(experts.length ? {
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: experts.length,
          itemListElement: experts.map((expert, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: expert.name,
            description: [expert.serviceType, expert.city, expert.expertise].filter(Boolean).join(" · "),
          })),
        },
      } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "Experts and services", item: canonical },
      ],
    },
  ]);
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

function configuredApiOrigin() {
  try {
    const api = new URL(process.env.API_ORIGIN?.trim() || "");
    if (api.protocol !== "https:" || api.username || api.password || api.pathname !== "/" || api.search || api.hash) return null;
    return api;
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
  const api = configuredApiOrigin();
  if (!incomingOrigin || !api) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    res.end(req.method === "HEAD" ? undefined : "Directory is temporarily unavailable");
    return;
  }
  const origin = canonicalSiteOrigin(incomingOrigin);
  const isPreview = isPreviewDeployment();
  try {
    const [shellResponse, expertsResponse, contentResponse] = await Promise.all([
      fetch(`${incomingOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/experts", api), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/site-content", api), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) }),
    ]);
    if (!shellResponse.ok || !expertsResponse.ok || !contentResponse.ok) throw new Error("Directory data unavailable");
    const [experts, content] = await Promise.all([
      expertsResponse.json() as Promise<PublicExpert[]>,
      contentResponse.json() as Promise<Record<string, unknown>>,
    ]);
    if (!Array.isArray(experts)) throw new Error("Invalid directory response");
    const configuredTitle = typeof content["seo.expertsTitle"] === "string" ? content["seo.expertsTitle"] : undefined;
    const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
      ? content["seo.siteTitle"].trim()
      : "Material Square";
    const noIndex = isPreview || experts.length === 0;
    const html = renderExpertIndex(await shellResponse.text(), experts, origin, noIndex, content, configuredTitle, siteTitle);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      ...(noIndex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    res.end(req.method === "HEAD" ? undefined : "Directory is temporarily unavailable");
  }
}
