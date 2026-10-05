import type { IncomingMessage, ServerResponse } from "node:http";

type PublicArticle = {
  slug: string;
  title: string;
  summary: string;
  featuredImageUrl: string | null;
};

const previewApiOrigin = "https://material-square-demo-api.onrender.com";

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
) {
  const canonical = `${origin}/blogs/${encodeURIComponent(article.slug)}`;
  const image = safePublicImage(article.featuredImageUrl, origin);
  let html = shell.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(`${article.title} | Material Square`)}</title>`,
  );
  html = setMeta(html, "name", "description", brief(article.summary));
  html = setMeta(
    html,
    "name",
    "robots",
    noIndex ? "noindex, nofollow" : "index, follow",
  );
  html = setMeta(html, "property", "og:type", "article");
  html = setMeta(html, "property", "og:site_name", "Material Square");
  html = setMeta(
    html,
    "property",
    "og:title",
    `${article.title} | Material Square`,
  );
  html = setMeta(html, "property", "og:description", brief(article.summary));
  html = setMeta(html, "property", "og:image", image);
  html = setMeta(html, "property", "og:url", canonical);
  html = setMeta(html, "name", "twitter:card", "summary_large_image");
  html = setMeta(
    html,
    "name",
    "twitter:title",
    `${article.title} | Material Square`,
  );
  html = setMeta(html, "name", "twitter:description", brief(article.summary));
  html = setMeta(html, "name", "twitter:image", image);
  return addCanonical(html, canonical);
}

function safePublicImage(imageUrl: string | null, origin: string) {
  if (!imageUrl) return `${origin}/social-card.svg`;
  try {
    const url = new URL(imageUrl, origin);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : `${origin}/social-card.svg`;
  } catch {
    return `${origin}/social-card.svg`;
  }
}

function brief(value: string, maximum = 180) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > maximum
    ? `${text.slice(0, maximum - 1).trimEnd()}…`
    : text;
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

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Cache-Control": "no-store" });
    res.end();
    return;
  }

  const origin = getRequestOrigin(req);
  const incoming = new URL(req.url || "/", origin || "https://invalid.local");
  const slug = incoming.searchParams.get("slug") || "";
  if (
    !origin ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 220
  ) {
    respond(res, 400, "Invalid article address");
    return;
  }

  const configuredApiOrigin =
    process.env.API_ORIGIN?.trim() ||
    (process.env.VERCEL_ENV === "preview" ? previewApiOrigin : "");
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
    const [shellResponse, articleResponse] = await Promise.all([
      fetch(`${origin}/`),
      fetch(new URL(`/api/blogs/${encodeURIComponent(slug)}`, apiOrigin), {
        headers: { Accept: "application/json" },
      }),
    ]);
    if (!shellResponse.ok) {
      respond(res, 502, "Customer website is unavailable");
      return;
    }
    const shell = await shellResponse.text();
    if (!articleResponse.ok) {
      const notFound = renderArticleHtml(
        shell,
        {
          slug,
          title: "Article not found",
          summary: "This article is not available.",
          featuredImageUrl: null,
        },
        origin,
        true,
      );
      res.writeHead(articleResponse.status === 404 ? 404 : 503, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      });
      res.end(req.method === "HEAD" ? undefined : notFound);
      return;
    }

    const article = (await articleResponse.json()) as PublicArticle;
    const html = renderArticleHtml(
      shell,
      { ...article, slug },
      origin,
      process.env.VERCEL_ENV !== "production",
    );
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
      ...(process.env.VERCEL_ENV !== "production"
        ? { "X-Robots-Tag": "noindex, nofollow" }
        : {}),
    });
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    respond(res, 503, "Article preview is temporarily unavailable");
  }
}
