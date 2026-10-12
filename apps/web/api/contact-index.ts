import type { IncomingMessage, ServerResponse } from "node:http";
import {
  publicFaqEntries,
  SEO_ROUTE_DESCRIPTIONS,
  type SiteContent,
} from "@material-square/types";
import { canonicalSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { setPageStructuredData } from "./structured-data.js";
import { setSocialCardMetadata } from "./social-metadata.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

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

function brief(value: string, maximum = 160) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maximum) return normalized;
  const shortened = normalized.slice(0, maximum - 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || normalized.slice(0, maximum - 1).trim()}…`;
}

function renderContactPage(shell: string, content: SiteContent, origin: string, noIndex: boolean) {
  const canonical = `${origin}/contact`;
  const siteTitle = content["seo.siteTitle"]?.trim() || "Material Square";
  const title = content["seo.contactTitle"]?.trim() || "Contact Material Square";
  const description = brief(content["contact.description"]?.trim() || SEO_ROUTE_DESCRIPTIONS["/contact"]);
  const faqs = publicFaqEntries(content);
  const pageSchema = {
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
  };
  const faqSchema = faqs.length ? [{
    ...pageSchema,
  }, {
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  }] : [pageSchema];
  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: title, item: canonical },
    ],
  };

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
  shell = setPageStructuredData(shell, [...faqSchema, breadcrumbSchema]);

  const faqFallback = faqs.length
    ? `<section aria-labelledby="seo-contact-faq"><h2 id="seo-contact-faq">Frequently asked questions</h2>${faqs.map(({ question, answer }) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer).replace(/\n/g, "<br />")}</p></details>`).join("")}</section>`
    : "";
  const fallback = `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › Contact</nav><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p>Contact Material Square about materials and project quotations. Share your site PIN code so the team can check availability and delivery.</p>${faqFallback}<nav aria-label="Explore more"><a href="/marketplace">Browse materials</a><a href="/get-quote">Request a quotation</a></nav></main></noscript>`;
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
    res.end(req.method === "HEAD" ? undefined : "Contact page is temporarily unavailable");
    return;
  }
  try {
    const [shellResponse, contentResponse] = await Promise.all([
      fetch(`${incomingOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/site-content", api), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(3500) }),
    ]);
    if (!shellResponse.ok || !contentResponse.ok) throw new Error("Contact content unavailable");
    const content = await contentResponse.json() as SiteContent;
    const noIndex = isPreviewDeployment();
    const html = renderContactPage(await shellResponse.text(), content, canonicalSiteOrigin(incomingOrigin), noIndex);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      ...(noIndex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
    res.end(req.method === "HEAD" ? undefined : "Contact page is temporarily unavailable");
  }
}
