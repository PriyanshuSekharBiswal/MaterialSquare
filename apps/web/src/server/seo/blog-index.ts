import type { IncomingMessage, ServerResponse } from "node:http";
import { canonicalSiteOrigin, trustedSiteOrigin } from "./seo-origin.js";
import { isPreviewDeployment } from "./seo-environment.js";
import { setPageStructuredData } from "./structured-data.js";
import { setSocialCardMetadata } from "./social-metadata.js";
import { setSiteIdentityStructuredData } from "./site-identity.js";

type PublicArticle = {
  title: string;
  slug: string;
  summary: string;
  featuredImageUrl: string | null;
  publishedAt: string;
  authorName?: string | null;
};

const pageDescription =
  "Read practical articles on construction materials, product specifications and project procurement from Material Square.";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) =>
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
  const expression = new RegExp(`<meta\\s+${kind}=["']${key}["'][^>]*>`, "i");
  const tag = `<meta ${kind}="${key}" content="${escapeHtml(value)}" />`;
  return expression.test(html)
    ? html.replace(expression, tag)
    : html.replace("</head>", `  ${tag}\n</head>`);
}

function articleImage(article: PublicArticle, origin: string) {
  if (!article.featuredImageUrl) return null;
  try {
    const image = new URL(article.featuredImageUrl, origin);
    if (image.protocol !== "http:" && image.protocol !== "https:") return null;
    // Match article detail metadata and the rendered journal cover: bundled
    // editorial artwork has a smaller WebP version for crawler thumbnails.
    if (
      image.origin === origin &&
      image.pathname === "/images/materials-editorial.png"
    ) {
      image.pathname = "/images/materials-editorial.webp";
    }
    return image.href;
  } catch {
    return null;
  }
}

function articleDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `<time datetime="${escapeHtml(date.toISOString())}">${escapeHtml(date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }))}</time>`;
}

function renderFallback(articles: PublicArticle[], origin: string) {
  const entries = articles
    .map((article) => {
      const url = `/blogs/${encodeURIComponent(article.slug)}`;
      const image = articleImage(article, origin);
      const editorialImage = image === `${origin}/images/materials-editorial.webp`;
      const imageDimensions = editorialImage ? ' width="1536" height="1024"' : "";
      return `<article>${image ? `<a href="${url}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(image)}" alt=""${imageDimensions} loading="lazy" decoding="async" /></a>` : ""}<p>${articleDate(article.publishedAt)}${article.authorName ? ` · ${escapeHtml(article.authorName)}` : ""}</p><h2><a href="${url}">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.summary)}</p><a href="${url}">Read article →</a></article>`;
    })
    .join("");
  const emptyState = articles.length
    ? ""
    : "<p>New articles are on the way.</p>";
  return `<noscript><main class="seo-static-fallback"><nav aria-label="Breadcrumb"><a href="/">Home</a> › Articles</nav><p>MATERIAL SQUARE JOURNAL</p><h1>Ideas for a better-built project</h1><p>${escapeHtml(pageDescription)}</p>${emptyState}<div>${entries}</div><nav aria-label="Explore more"><a href="/marketplace">Browse materials</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`;
}

function renderPage(
  shell: string,
  articles: PublicArticle[],
  origin: string,
  noIndex: boolean,
  content: Record<string, unknown>,
  configuredTitle?: string,
  siteTitle = "Material Square",
) {
  const canonical = `${origin}/blogs`;
  const title = configuredTitle?.trim() || "Articles | Material Square";
  shell = shell.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`,
  );
  shell = setMeta(shell, "name", "description", pageDescription);
  shell = setMeta(
    shell,
    "name",
    "robots",
    noIndex ? "noindex, nofollow" : "index, follow",
  );
  shell = setMeta(shell, "property", "og:type", "website");
  shell = setMeta(shell, "property", "og:site_name", siteTitle);
  shell = setMeta(shell, "property", "og:title", title);
  shell = setMeta(shell, "property", "og:description", pageDescription);
  shell = setMeta(shell, "property", "og:url", canonical);
  shell = setMeta(shell, "name", "twitter:title", title);
  shell = setMeta(shell, "name", "twitter:description", pageDescription);
  shell = setSocialCardMetadata(shell, origin);
  shell = setSiteIdentityStructuredData(shell, origin, content);
  shell = shell.replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "");
  shell = shell.replace(
    "</head>",
    `  <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`,
  );

  const pageSchema = {
    "@type": "CollectionPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description: pageDescription,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${origin}/blogs/${encodeURIComponent(article.slug)}`,
        name: article.title,
      })),
    },
  };
  shell = setPageStructuredData(shell, [
    pageSchema,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "Articles", item: canonical },
      ],
    },
  ]);

  const fallback = renderFallback(articles, origin);
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
  return trustedSiteOrigin(`${protocol === "http" && isPreviewDeployment() ? "http" : "https"}://${host}`);
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
  if (!requestOrigin || !apiOrigin) {
    res.writeHead(503, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Article index is unavailable");
    return;
  }

  try {
    const [shellResponse, articlesResponse, contentResponse] = await Promise.all([
      fetch(`${requestOrigin}/__app-shell.html`, { signal: AbortSignal.timeout(3500) }),
      fetch(new URL("/api/blogs?page=1", apiOrigin), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      }),
      fetch(new URL("/api/site-content", apiOrigin), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3500),
      }),
    ]);
    if (!shellResponse.ok || !articlesResponse.ok || !contentResponse.ok) {
      throw new Error("The article index is temporarily unavailable");
    }
    const [articles, content] = await Promise.all([
      articlesResponse.json() as Promise<PublicArticle[]>,
      contentResponse.json() as Promise<Record<string, unknown>>,
    ]);
    if (!Array.isArray(articles)) throw new Error("Invalid article response");
    const configuredTitle = typeof content["seo.blogsTitle"] === "string"
      ? content["seo.blogsTitle"]
      : undefined;
    const siteTitle = typeof content["seo.siteTitle"] === "string" && content["seo.siteTitle"].trim()
      ? content["seo.siteTitle"].trim()
      : "Material Square";
    const html = renderPage(
      await shellResponse.text(),
      articles,
      canonicalSiteOrigin(requestOrigin),
      isPreviewDeployment() || articles.length === 0,
      content,
      configuredTitle,
      siteTitle,
    );
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      ...(isPreviewDeployment() || articles.length === 0
        ? { "X-Robots-Tag": "noindex, nofollow" }
        : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.writeHead(503, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    });
    res.end(req.method === "HEAD" ? undefined : "Article index is temporarily unavailable");
  }
}
