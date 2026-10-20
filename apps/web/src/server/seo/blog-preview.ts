import type { IncomingMessage, ServerResponse } from "node:http";
import { canonicalSiteOrigin, trustedSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { retainSharedStructuredData } from "./structured-data.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

type PublicArticle = {
  slug: string;
  title: string;
  summary: string;
  body?: string;
  featuredImageUrl: string | null;
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string | null;
};

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
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

function removeMeta(html: string, property: string) {
  return html.replace(
    new RegExp(`<meta\\s+property=["']${property}["'][^>]*>\\s*`, "i"),
    "",
  );
}

function addCanonical(html: string, url: string) {
  const expression = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

export function renderArticleHtml(
  shell: string,
  article: PublicArticle,
  origin: string,
  noIndex = false,
  siteTitle = "Material Square",
  content: Record<string, unknown> = {},
) {
  const canonical = `${origin}/blogs/${encodeURIComponent(article.slug)}`;
  const articleImage = publicImageUrl(article.featuredImageUrl, origin);
  const image = articleImage || `${origin}/social-card-v2.png`;
  const title = `${article.title} | ${siteTitle}`;
  // The shell has a homepage WebPage node; retain only the shared site entities.
  shell = retainSharedStructuredData(shell);
  shell = setSiteIdentityStructuredData(shell, origin, content);
  let html = shell.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`,
  );
  html = setMeta(html, "name", "description", brief(article.summary));
  html = setMeta(
    html,
    "name",
    "robots",
    noIndex ? "noindex, nofollow" : "index, follow",
  );
  html = setMeta(html, "property", "og:type", "article");
  html = setMeta(html, "property", "og:site_name", siteTitle);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", brief(article.summary));
  html = setMeta(html, "property", "og:image", image);
  if (articleImage) {
    html = removeMeta(html, "og:image:type");
    html = removeMeta(html, "og:image:width");
    html = removeMeta(html, "og:image:height");
  }
  const imageAlt = articleImage
    ? article.title
    : `${siteTitle} social card showing construction materials organized for every project.`;
  html = setMeta(html, "property", "og:image:alt", imageAlt);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(
    html,
    "name",
    "twitter:title",
    title,
  );
  html = setMeta(html, "name", "twitter:description", brief(article.summary));
  html = setMeta(html, "name", "twitter:image", image);
  html = setMeta(html, "name", "twitter:image:alt", imageAlt);
  const articleData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${canonical}#article`,
        inLanguage: "en-IN",
        headline: article.title,
        description: brief(article.summary),
        ...(article.body?.trim() ? { articleBody: article.body.trim() } : {}),
        ...(articleImage ? { image: [articleImage] } : {}),
        mainEntityOfPage: canonical,
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
        ...(article.authorName
          ? { author: articleAuthor(article.authorName, siteTitle) }
          : {}),
        publisher: {
          "@type": "Organization",
          "@id": `${origin}/#organization`,
          name: siteTitle,
          logo: { "@type": "ImageObject", url: `${origin}/favicon.png` },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
          { "@type": "ListItem", position: 2, name: "Articles", item: `${origin}/blogs` },
          { "@type": "ListItem", position: 3, name: article.title, item: canonical },
        ],
      },
    ],
  };
  const structuredData = `<script id="ms-article-structured-data" type="application/ld+json">${JSON.stringify(articleData).replace(/</g, "\\u003c")}</script>`;
  html = html.replace(/<script id="ms-article-structured-data"[\s\S]*?<\/script>/i, "");
  html = html.replace("</head>", `  <noscript><style>.boot-loading{display:none!important}</style></noscript>\n  ${structuredData}\n</head>`);
  return addCanonical(html, canonical);
}

function renderArticleNotFoundHtml(shell: string) {
  const title = "Article not found | Material Square";
  const description = "This article could not be found in the Material Square journal. Browse published articles or explore construction materials.";
  let html = shell.replace(/<script\s+id=["']ms-page-structured-data["'][\s\S]*?<\/script>/i, "");
  html = html.replace(/<script\s+id=["']ms-article-structured-data["'][\s\S]*?<\/script>/i, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  html = html.replace(/<meta\s+property=["']og:url["'][^>]*>\s*/gi, "");
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "name", "robots", "noindex, nofollow");
  html = setMeta(html, "property", "og:type", "website");
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);
  const fallback = `<noscript><style>.boot-loading{display:none!important}</style><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><p><a href="/blogs">Browse published articles</a> · <a href="/marketplace">Explore construction materials</a></p></main></noscript>`;
  return html.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${fallback}`);
}

function publicImageUrl(imageUrl: string | null, origin: string) {
  if (!imageUrl) return null;
  try {
    const url = new URL(imageUrl, origin);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (
      url.origin === origin &&
      url.pathname === "/images/materials-editorial.png"
    ) {
      url.pathname = "/images/materials-editorial.webp";
    }
    return url.href;
  } catch {
    return null;
  }
}

function brief(value: string, maximum = 160) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > maximum
    ? `${text.slice(0, maximum - 1).trimEnd()}…`
    : text;
}

function articleAuthor(name: string, organizationName: string) {
  const normalizedName = name.trim().toLocaleLowerCase();
  const normalizedOrganization = organizationName.trim().toLocaleLowerCase();
  const isOrganization =
    normalizedName === normalizedOrganization ||
    /\b(?:editorial\s+(?:desk|team)|content\s+team)\b/i.test(name);
  return { "@type": isOrganization ? "Organization" : "Person", name: name.trim() };
}

function renderNoScriptArticle(article: PublicArticle) {
  const paragraphs = (article.body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const published = article.publishedAt
    ? `<time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(new Date(article.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }))}</time>`
    : "";
  return `<noscript><main><nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/blogs">Articles</a> › ${escapeHtml(article.title)}</nav><article><h1>${escapeHtml(article.title)}</h1>${article.summary ? `<p>${escapeHtml(article.summary)}</p>` : ""}<p>${published}${article.authorName ? `${published ? " · " : ""}${escapeHtml(article.authorName)}` : ""}</p>${paragraphs}</article><p><a href="/blogs">Browse all articles</a></p></main></noscript>`;
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
  return trustedSiteOrigin(`${protocol === "http" ? "http" : "https"}://${host}`);
}

function respond(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow",
  });
  res.end(message);
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
  const incoming = new URL(req.url || "/", requestOrigin || "https://invalid.local");
  const slug = incoming.searchParams.get("slug") || "";
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
    req.headers.host;
  if (!host || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(host)) {
    respond(res, 400, "Invalid article address");
    return;
  }
  if (!requestOrigin) {
    respond(res, 503, "Article preview is unavailable");
    return;
  }
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 220
  ) {
    respond(res, 400, "Invalid article address");
    return;
  }
  const origin = canonicalSiteOrigin(requestOrigin);

  const configuredApiOrigin = process.env.API_ORIGIN?.trim() || "";
  let apiOrigin: URL;
  try {
    apiOrigin = new URL(configuredApiOrigin);
    if (
      apiOrigin.protocol !== "https:" ||
      apiOrigin.username ||
      apiOrigin.password ||
      apiOrigin.pathname !== "/"
    )
      throw new Error("Invalid API origin");
  } catch {
    respond(res, 503, "Article preview is unavailable");
    return;
  }

  try {
    const [shellResponse, articleResponse, contentResponse] = await Promise.all([
      fetch(`${requestOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(8000) }),
      fetch(new URL(`/api/blogs/${encodeURIComponent(slug)}`, apiOrigin), {
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
    const shell = await shellResponse.text();
    if (!articleResponse.ok) {
      const notFound = renderArticleNotFoundHtml(shell);
      res.writeHead(articleResponse.status === 404 ? 404 : 503, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      });
      res.end(req.method === "HEAD" ? undefined : notFound);
      return;
    }

    if (!contentResponse.ok) {
      respond(res, 503, "Article metadata is temporarily unavailable");
      return;
    }
    const article = (await articleResponse.json()) as PublicArticle;
    const content = await contentResponse.json() as Record<string, unknown>;
    const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
      ? content["seo.siteTitle"].trim()
      : "Material Square";
    const html = renderArticleHtml(
      shell,
      { ...article, slug },
      origin,
      isPreviewDeployment(),
      siteTitle,
      content,
    );
    const withArticleFallback = html.replace(
      /(<div\s+id=["']root["'][^>]*>)/i,
      `$1${renderNoScriptArticle({ ...article, slug })}`,
    );
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      ...(isPreviewDeployment()
        ? { "X-Robots-Tag": "noindex, nofollow" }
        : {}),
    });
    res.end(req.method === "HEAD" ? undefined : withArticleFallback);
  } catch {
    respond(res, 503, "Article preview is temporarily unavailable");
  }
}
