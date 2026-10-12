import type { IncomingMessage, ServerResponse } from "node:http";
import type { SiteContent } from "@material-square/types";
import {
  SEO_ROUTE_DESCRIPTIONS,
  SEO_SERVICE_AREA_PAGES,
  parseSocialLinks,
  serviceAreaSlugs,
} from "./runtime-types.js";
import { canonicalSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { setPageStructuredData } from "./structured-data.js";

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

function formatIndianTelephone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits.startsWith("91") ? digits : `91${digits}`}`;
}

function brief(value: string, maximum = 160) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > maximum
    ? `${text.slice(0, maximum - 1).trimEnd()}…`
    : text;
}

function renderHomepage(shell: string, content: SiteContent, origin: string, noIndex: boolean) {
  const canonical = `${origin}/`;
  const siteTitle = content["seo.siteTitle"].trim() || "Material Square";
  const title = content["seo.homeTitle"].trim() || `${siteTitle} | Construction Materials`;
  const description = brief(content["seo.description"].trim() || SEO_ROUTE_DESCRIPTIONS["/"]);
  const heading = content["home.title"].trim() || title;
  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;
  const coveredAreas = SEO_SERVICE_AREA_PAGES
    .filter((area) => serviceAreaSlugs(content["contact.location"]).includes(area.slug))
    .map((area) => area.name);
  const officialProfiles = parseSocialLinks(content["footer.socialLinks"])
    .map(({ url }) => url);

  shell = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  shell = setMeta(shell, "name", "description", description);
  shell = setMeta(shell, "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  shell = setMeta(shell, "property", "og:type", "website");
  shell = setMeta(shell, "property", "og:site_name", siteTitle);
  shell = setMeta(shell, "property", "og:title", title);
  shell = setMeta(shell, "property", "og:description", description);
  shell = setMeta(shell, "property", "og:url", canonical);
  shell = setMeta(shell, "property", "og:image", `${origin}/social-card.png`);
  shell = setMeta(shell, "name", "twitter:title", title);
  shell = setMeta(shell, "name", "twitter:description", description);
  shell = setMeta(shell, "name", "twitter:image", `${origin}/social-card.png`);
  shell = shell.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  shell = shell.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);

  const configuredHeroImage = content["home.heroImage"].trim();
  if (configuredHeroImage) {
    try {
      const heroImage = new URL(configuredHeroImage, origin);
      if (
        heroImage.protocol === "https:" &&
        !heroImage.username &&
        !heroImage.password
      ) {
        shell = shell.replace(
          "</head>",
          `  <link rel="preload" as="image" href="${escapeHtml(heroImage.href)}" fetchpriority="high" />\n</head>`,
        );
      }
    } catch {
      // Ignore malformed legacy values; the client page still renders normally.
    }
  }

  // Replace the build-time homepage graph with the current public business
  // details so organization and area data do not go stale after content edits.
  shell = shell.replace(/<script\s+id=["']ms-page-structured-data["'][\s\S]*?<\/script>/i, "");
  shell = setPageStructuredData(shell, [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: siteTitle,
      url: canonical,
      logo: { "@type": "ImageObject", url: `${origin}/favicon.png` },
      description,
      ...(content["contact.officeAddress"].trim()
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: content["contact.officeAddress"].trim(),
              addressCountry: "IN",
            },
          }
        : {}),
      ...(officialProfiles.length ? { sameAs: officialProfiles } : {}),
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        ...(content["contact.phone"] ? { telephone: formatIndianTelephone(content["contact.phone"]) } : {}),
        ...(content["contact.email"] ? { email: content["contact.email"] } : {}),
        url: `${origin}/contact`,
      },
      ...(coveredAreas.length
        ? { areaServed: coveredAreas.map((name) => ({ "@type": "City", name })) }
        : {}),
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: siteTitle,
      url: canonical,
      inLanguage: "en-IN",
      publisher: { "@id": organizationId },
    },
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      isPartOf: { "@id": websiteId },
    },
  ]);

  const fallbackHeading = escapeHtml(heading).replace(/\n/g, "<br />");
  const fallback = `<noscript><main class="seo-static-fallback"><h1>${fallbackHeading}</h1><p>${escapeHtml(description)}</p><nav aria-label="Explore materials"><a href="/marketplace">Browse construction materials</a><a href="/get-quote">Prepare a material enquiry</a><a href="/contact">Contact ${escapeHtml(siteTitle)}</a></nav></main></noscript>`;
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
  const api = configuredApiOrigin();
  if (!incomingOrigin || !api) {
    res.writeHead(503, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Homepage is temporarily unavailable");
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
    if (!shellResponse.ok || !contentResponse.ok) throw new Error("Homepage content unavailable");
    const content = await contentResponse.json() as SiteContent;
    const isPreview = isPreviewDeployment();
    const html = renderHomepage(
      await shellResponse.text(),
      content,
      canonicalSiteOrigin(incomingOrigin),
      isPreview,
    );
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
    res.end(req.method === "HEAD" ? undefined : "Homepage is temporarily unavailable");
  }
}
