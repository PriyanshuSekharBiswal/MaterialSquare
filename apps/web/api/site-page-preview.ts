import type { IncomingMessage, ServerResponse } from "node:http";
import {
  guideTabContent,
  SEO_ROUTE_DESCRIPTIONS,
  visibleGuideTabs,
  type SiteContent,
} from "@material-square/types";
import { canonicalSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { retainSharedStructuredData, setPageStructuredData } from "./structured-data.js";
import { setSocialCardMetadata } from "./social-metadata.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

const pages = {
  "/why-us": {
    titleKey: "seo.whyUsTitle",
    descriptionKey: "whyUs.description",
    headingKey: "whyUs.title",
    fallbackTitle: "Why Material Square",
  },
  "/guides": {
    titleKey: "seo.guidesTitle",
    descriptionKey: "guides.description",
    headingKey: "guides.title",
    fallbackTitle: "Material Guides | Material Square",
  },
  "/get-quote": {
    titleKey: "seo.quoteTitle",
    descriptionKey: "getQuote.description",
    headingKey: "getQuote.title",
    fallbackTitle: "Request a Quotation | Material Square",
  },
} as const;

type PagePath = keyof typeof pages;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
    ]!,
  );
}

function brief(value: string, maximum = 160) {
  const normalized = value.trim().replace(/\s+/g, " ");
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

function renderPage(shell: string, content: SiteContent, path: PagePath, origin: string, noIndex: boolean) {
  const config = pages[path];
  const title = content[config.titleKey]?.trim() || config.fallbackTitle;
  const heading = content[config.headingKey]?.trim() || title;
  const description = brief(
    content[config.descriptionKey]?.trim() || SEO_ROUTE_DESCRIPTIONS[path],
  );
  const canonical = `${origin}${path}`;

  shell = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  shell = setMeta(shell, "name", "description", description);
  shell = setMeta(shell, "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  shell = setMeta(shell, "property", "og:type", "website");
  shell = setMeta(shell, "property", "og:site_name", content["seo.siteTitle"]?.trim() || "Material Square");
  shell = setMeta(shell, "property", "og:title", title);
  shell = setMeta(shell, "property", "og:description", description);
  shell = setMeta(shell, "property", "og:url", canonical);
  shell = setMeta(shell, "name", "twitter:title", title);
  shell = setMeta(shell, "name", "twitter:description", description);
  shell = setSocialCardMetadata(shell, origin);
  shell = setSiteIdentityStructuredData(shell, origin, content);
  shell = shell.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  shell = shell.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);

  shell = retainSharedStructuredData(shell);
  shell = setPageStructuredData(shell, [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: { "@id": `${origin}/#website` },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: heading, item: canonical },
      ],
    },
  ]);

  const guideTopics = path === "/guides"
    ? `<section aria-labelledby="seo-guide-topics"><h2 id="seo-guide-topics">Guide topics</h2><ul>${visibleGuideTabs(content).map((id) => {
        const guide = guideTabContent(content, id);
        return `<li><h3>${escapeHtml(guide.title)}</h3><p>${escapeHtml(guide.description)}</p></li>`;
      }).join("")}</ul><p><strong>Professional verification required.</strong> This page does not calculate cable sizes or approve plumbing designs. Have a qualified professional confirm the design, exact product and applicable standards.</p><p>${escapeHtml(content["guides.callout.description"])}</p></section>`
    : "";
  const fallback = `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › ${escapeHtml(heading)}</nav><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p>${guideTopics}<nav aria-label="Explore more"><a href="/marketplace">Browse construction materials</a><a href="/get-quote">Prepare a material enquiry</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`;
  shell = shell.replace(/<noscript><main class="seo-static-fallback">[\s\S]*?<\/main><\/noscript>/i, "");
  return shell.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${fallback}`);
}

function requestOrigin(req: IncomingMessage) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) return null;
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol)
    ?.split(",")[0]
    ?.trim();
  return `${protocol === "http" && isPreviewDeployment() ? "http" : "https"}://${host}`;
}

function configuredApiOrigin() {
  try {
    const api = new URL(process.env.API_ORIGIN?.trim() || "");
    if (api.protocol !== "https:" || api.username || api.password || api.pathname !== "/" || api.search || api.hash)
      return null;
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
  const incomingUrl = new URL(req.url || "/", incomingOrigin || "https://invalid.local");
  const requestedPath = incomingUrl.searchParams.get("path") || "";
  const path = requestedPath in pages ? requestedPath as PagePath : null;
  const api = configuredApiOrigin();
  if (!incomingOrigin || !path || !api) {
    const status = !path ? 404 : 503;
    res.writeHead(status, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : status === 404 ? "Page not found" : "Page is temporarily unavailable");
    return;
  }

  try {
    const [shellResponse, contentResponse] = await Promise.all([
      fetch(`${incomingOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/site-content", api), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      }),
    ]);
    if (!shellResponse.ok || !contentResponse.ok) throw new Error("Page content unavailable");
    const content = await contentResponse.json() as SiteContent;
    const isPreview = isPreviewDeployment();
    const html = renderPage(await shellResponse.text(), content, path, canonicalSiteOrigin(incomingOrigin), isPreview);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      ...(isPreview ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Page is temporarily unavailable");
  }
}
