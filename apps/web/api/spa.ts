import type { IncomingMessage, ServerResponse } from "node:http";
import type { FaqEntry, PolicyKind, SiteContent } from "@material-square/types";
import { canonicalSiteOrigin } from "../src/server/seo/seo-origin.js";
import { isPreviewDeployment } from "../src/server/seo/seo-environment.js";
import { formatContactPhone, parsePolicy, publicFaqEntries, SEO_ROUTE_DESCRIPTIONS, websitePageDescription } from "../src/server/seo/runtime-types.js";
import { setPageStructuredData } from "../src/server/seo/structured-data.js";
import { setSocialCardMetadata } from "../src/server/seo/social-metadata.js";
import { setSiteIdentityStructuredData } from "../src/server/seo/site-identity.js";

type PublishedPage = {
  path: string;
  title: string;
  description?: string;
  published: boolean;
  sections?: Array<{
    kind: string;
    title: string;
    body: string;
    imageUrl: string;
    imageAlt: string;
    buttonLabel: string;
    buttonPath: string;
    visible: boolean;
  }>;
};

function renderPolicyFallback(
  kind: PolicyKind,
  policy: ReturnType<typeof parsePolicy>,
  contactEmail: string,
  contactPhone: string,
) {
  if (!policy.published) {
    const label = {
      privacy: "Privacy information",
      terms: "Website terms",
      shipping: "Shipping policy",
      returns: "Return policy",
    }[kind];
    return `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › ${label}</nav><h1>${label}</h1><p>This information is being reviewed and is not published yet.</p><a href="/contact">Contact Material Square</a></main></noscript>`;
  }
  const sections = policy.sections
    .map((section) =>
      `<section id="${escapeHtml(section.heading.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}"><h2>${escapeHtml(section.heading.replaceAll("{{contactEmail}}", contactEmail).replaceAll("{{contactPhone}}", contactPhone))}</h2><p>${escapeHtml(section.body.replaceAll("{{contactEmail}}", contactEmail).replaceAll("{{contactPhone}}", contactPhone)).replace(/\n/g, "<br />")}</p></section>`,
    )
    .join("");
  const cookieSection = policy.sections.find((section) => /cookie/i.test(section.heading));
  const relatedPolicy = kind === "privacy"
    ? `<a href="/terms">Read website terms</a>`
    : kind === "terms"
      ? `<a href="/privacy">Read privacy notice</a>`
      : `<a href="/contact">Contact Material Square</a>`;
  const cookieLink = kind === "privacy" && cookieSection
    ? `<a href="/privacy#${escapeHtml(cookieSection.heading.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))}">Cookie information</a>`
    : "";
  const replaceContact = (value: string) => value.replaceAll("{{contactEmail}}", contactEmail).replaceAll("{{contactPhone}}", contactPhone);
  return `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › ${escapeHtml(policy.title)}</nav><h1>${escapeHtml(replaceContact(policy.title))}</h1><p>${escapeHtml(replaceContact(policy.notice))}</p>${sections}<nav aria-label="Related policies">${relatedPolicy}${cookieLink}<a href="/contact">Contact Material Square</a></nav></main></noscript>`;
}

function applyPolicyMetadata(
  html: string,
  kind: PolicyKind,
  policy: ReturnType<typeof parsePolicy>,
  canonical: string,
  siteTitle: string,
  content: Record<string, unknown>,
  isPreview: boolean,
) {
  const description = SEO_ROUTE_DESCRIPTIONS[new URL(canonical).pathname] || "";
  const title = `${policy.title} | ${siteTitle}`;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", isPreview || !policy.published ? "noindex, nofollow" : "index, follow");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:site_name", siteTitle);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setSocialCardMetadata(html, new URL(canonical).origin);
  html = setSiteIdentityStructuredData(html, new URL(canonical).origin, content);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  html = html.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);
  html = setPageStructuredData(html, [{
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { "@id": `${new URL(canonical).origin}/#website` },
  }]);
  return html.replace(
    /<noscript><main class="seo-static-fallback">[\s\S]*?<\/main><\/noscript>/i,
    () => renderPolicyFallback(
      kind,
      policy,
      typeof content["contact.email"] === "string" ? content["contact.email"] : "",
      formatContactPhone(typeof content["contact.phone"] === "string" ? content["contact.phone"] : ""),
    ),
  );
}

function renderFaqFallback(entries: FaqEntry[]) {
  const answers = entries.map(({ question, answer }) =>
    `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`,
  ).join("");
  return `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › Help and support</nav><h1>Frequently asked questions</h1><p>Answers to common questions about products, quotations, availability and delivery.</p>${answers || "<p>There are no published FAQs at the moment.</p>"}<a href="/contact">Contact Material Square</a></main></noscript>`;
}

function applyFaqMetadata(
  html: string,
  entries: FaqEntry[],
  canonical: string,
  siteTitle: string,
  content: Record<string, unknown>,
  isPreview: boolean,
) {
  const title = `Frequently asked questions | ${siteTitle}`;
  const description = SEO_ROUTE_DESCRIPTIONS["/faq"];
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", isPreview || !entries.length ? "noindex, nofollow" : "index, follow");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:site_name", siteTitle);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  html = setSocialCardMetadata(html, new URL(canonical).origin);
  html = setSiteIdentityStructuredData(html, new URL(canonical).origin, content);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  html = html.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);
  html = setPageStructuredData(html, [
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
    },
    ...(entries.length ? [{
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: entries.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      })),
    }] : []),
  ]);
  html = html.replace(/<noscript><main class="seo-static-fallback">[\s\S]*?<\/main><\/noscript>/i, "");
  return html.replace(/(<div\s+id=["']root["'][^>]*>)/i, (root) => `${root}${renderFaqFallback(entries)}`);
}

function requestOrigin(req: IncomingMessage) {
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

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );
}

function setMeta(
  html: string,
  kind: "name" | "property",
  key: string,
  value: string,
) {
  const matcher = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return matcher.test(html)
    ? html.replace(matcher, () => tag)
    : html.replace("</head>", () => `  ${tag}\n</head>`);
}

function pageFallback(page: PublishedPage) {
  const description = websitePageDescription(page);
  const sections = (page.sections || [])
    .filter((section) => section.visible)
    .map((section) => {
      const image = section.imageUrl
        ? `<img src="${escapeHtml(section.imageUrl)}" alt="${escapeHtml(section.imageAlt || section.title)}"${section.kind === "hero" ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async" />`
        : "";
      const body = section.body
        ? `<p>${escapeHtml(section.body).replace(/\n/g, "<br />")}</p>`
        : "";
      const link = section.buttonPath
        ? `<p><a href="${escapeHtml(section.buttonPath)}">${escapeHtml(section.buttonLabel)}</a></p>`
        : "";
      return `<section><h2>${escapeHtml(section.title)}</h2>${image}${body}${link}</section>`;
    })
    .join("");
  return `<noscript><main class="seo-static-fallback"><h1>${escapeHtml(page.title)}</h1>${description ? `<p>${escapeHtml(description)}</p>` : ""}${sections}<nav aria-label="Primary"><a href="/">Home</a><a href="/marketplace">Browse materials</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`;
}

function applyManagedPageMetadata(
  html: string,
  page: PublishedPage,
  canonical: string,
  siteTitle: string,
  content: Record<string, unknown>,
  noIndex: boolean,
) {
  const title = page.title;
  const description = websitePageDescription(page);
  html = html.replace(
    /<title>[\s\S]*?<\/title>/i,
    () => `<title>${escapeHtml(title)}</title>`,
  );
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", noIndex ? "noindex, nofollow" : "index, follow");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:site_name", siteTitle);
  html = setMeta(
    html,
    "property",
    "og:description",
    description,
  );
  html = setSocialCardMetadata(html, new URL(canonical).origin);
  html = setSiteIdentityStructuredData(html, new URL(canonical).origin, content);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(
    html,
    "name",
    "twitter:description",
    description,
  );
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  html = html.replace(
    "</head>",
    `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`,
  );
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: page.title,
    ...(description ? { description } : {}),
    isPartOf: { "@id": `${new URL(canonical).origin}/#website` },
  };
  html = setPageStructuredData(html, [pageSchema]);
  return html.replace(
    /<noscript><main class="seo-static-fallback">[\s\S]*?<\/main><\/noscript>/i,
    () => pageFallback(page),
  );
}

function send(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: string,
  cache = "no-store",
) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": cache,
    ...(status >= 400 ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
  });
  res.end(req.method === "HEAD" ? undefined : body);
}

function getPath(req: IncomingMessage) {
  try {
    const incoming = new URL(req.url || "/", "https://internal.invalid");
    const rawPath = incoming.searchParams.get("path") || "/";
    const decoded = decodeURIComponent(rawPath);
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /[?#\p{Cc}]/u.test(decoded)
    )
      return null;
    const normalized =
      decoded.length > 1 ? decoded.replace(/\/+$/, "") : decoded;
    return normalized;
  } catch {
    return null;
  }
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

  const origin = requestOrigin(req);
  const pathname = getPath(req);
  if (!origin || !pathname) {
    send(
      req,
      res,
      404,
      '<!doctype html><html lang="en"><title>Page not found | Material Square</title><meta name="robots" content="noindex, nofollow"><h1>Page not found</h1><p><a href="/">Return to Material Square</a></p>',
    );
    return;
  }
  const canonicalOrigin = canonicalSiteOrigin(origin);

  if (/\.[a-z0-9]{1,10}$/i.test(pathname)) {
    send(
      req,
      res,
      404,
      '<!doctype html><html lang="en"><title>File not found | Material Square</title><meta name="robots" content="noindex, nofollow"><h1>File not found</h1>',
    );
    return;
  }

  if (pathname === "/account" || pathname.startsWith("/account/")) {
    try {
      const shell = await fetch(`${origin}/__app-shell.html`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!shell.ok) throw new Error("Customer site shell unavailable");
      const html = await shell.text();
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
        "X-Robots-Tag": "noindex, nofollow",
      });
      res.end(req.method === "HEAD" ? undefined : html);
    } catch {
      send(
        req,
        res,
        503,
        '<!doctype html><html lang="en"><title>Temporarily unavailable | Material Square</title><meta name="robots" content="noindex, nofollow"><h1>Temporarily unavailable</h1>',
      );
    }
    return;
  }

  if (pathname === "/material-list") {
    try {
      const shell = await fetch(`${origin}/__app-shell.html`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!shell.ok) throw new Error("Customer site shell unavailable");
      const canonical = `${canonicalOrigin}/material-list`;
      let html = await shell.text();
      html = html.replace(/<title>[\s\S]*?<\/title>/i, "<title>Your material list | Material Square</title>");
      html = setMeta(html, "name", "robots", "noindex, nofollow");
      html = setMeta(html, "property", "og:url", canonical);
      html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
      html = html.replace("</head>", `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);
      html = html.replace(/<script\s+id=["']ms-page-structured-data["'][\s\S]*?<\/script>/i, "");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
        "X-Robots-Tag": "noindex, nofollow",
      });
      res.end(req.method === "HEAD" ? undefined : html);
    } catch {
      send(req, res, 503, '<!doctype html><html lang="en"><title>Temporarily unavailable | Material Square</title><meta name="robots" content="noindex, nofollow"><h1>Temporarily unavailable</h1>');
    }
    return;
  }

  const apiOrigin = configuredApiOrigin();
  if (!apiOrigin) {
    send(
      req,
      res,
      503,
      '<!doctype html><html lang="en"><title>Page check unavailable | Material Square</title><meta name="robots" content="noindex, nofollow"><h1>Page check temporarily unavailable</h1>',
    );
    return;
  }

  try {
    const response = await fetch(new URL("/api/site-content", apiOrigin), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) throw new Error("Published page list unavailable");
    const content = (await response.json()) as Record<string, unknown>;
    const policyKinds: Record<string, PolicyKind> = {
      "/privacy": "privacy",
      "/terms": "terms",
      "/shipping": "shipping",
      "/return-policy": "returns",
    };
    if (policyKinds[pathname]) {
      const kind = policyKinds[pathname];
      const policy = parsePolicy(typeof content[`policy.${kind}`] === "string" ? content[`policy.${kind}`] as string : "", kind);
      const shell = await fetch(`${origin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) });
      if (!shell.ok) throw new Error("Customer site shell unavailable");
      const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
        ? content["seo.siteTitle"].trim()
        : "Material Square";
      const isPreview = isPreviewDeployment();
      const canonical = `${canonicalOrigin}${pathname}`;
      const html = applyPolicyMetadata(await shell.text(), kind, policy, canonical, siteTitle, content, isPreview);
      const noIndex = isPreview || !policy.published;
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
        ...(noIndex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
      });
      res.end(req.method === "HEAD" ? undefined : html);
      return;
    }
    if (pathname === "/faq") {
      const entries = publicFaqEntries(content as SiteContent);
      const shell = await fetch(`${origin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) });
      if (!shell.ok) throw new Error("Customer site shell unavailable");
      const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
        ? content["seo.siteTitle"].trim()
        : "Material Square";
      const isPreview = isPreviewDeployment();
      const canonical = `${canonicalOrigin}${pathname}`;
      const html = applyFaqMetadata(await shell.text(), entries, canonical, siteTitle, content, isPreview);
      const noIndex = isPreview || entries.length === 0;
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
        ...(noIndex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
      });
      res.end(req.method === "HEAD" ? undefined : html);
      return;
    }
    const rawPages = content["website.pages"];
    const pages =
      typeof rawPages === "string"
        ? (JSON.parse(rawPages) as PublishedPage[])
        : [];
    const page = Array.isArray(pages)
      ? pages.find(
          (candidate) => candidate?.published && candidate.path === pathname,
        )
      : undefined;
    if (!page) {
      send(
        req,
        res,
        404,
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page not found | Material Square</title><meta name="robots" content="noindex, nofollow"></head><body><main><h1>Page not found</h1><p>We couldn’t find that page.</p><p><a href="/">Return to Material Square</a> · <a href="/marketplace">Browse materials</a></p></main></body></html>',
        "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      );
      return;
    }

    const shell = await fetch(`${origin}/__app-shell.html`, {
      signal: AbortSignal.timeout(3500),
    });
    if (!shell.ok) throw new Error("Customer site shell unavailable");
    const isPreview = isPreviewDeployment();
    const noIndex = isPreview || !websitePageDescription(page);
    const html = applyManagedPageMetadata(
      await shell.text(),
      page,
      `${canonicalOrigin}${pathname}`,
      typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
        ? content["seo.siteTitle"].trim()
        : "Material Square",
      content,
      noIndex,
    );
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=120",
      ...(noIndex ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    send(
      req,
      res,
      503,
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page check temporarily unavailable | Material Square</title><meta name="robots" content="noindex, nofollow"></head><body><main><h1>Page check temporarily unavailable</h1><p>Please try again shortly.</p></main></body></html>',
    );
  }
}
