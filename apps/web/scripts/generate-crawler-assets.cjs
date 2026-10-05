const fs = require("node:fs");
const path = require("node:path");
const { SITE_CONTENT_DEFAULTS } = require("@material-square/types");

const outputRoot = path.resolve("dist");
const sourceHtml = fs.readFileSync(path.join(outputRoot, "index.html"), "utf8");
const configuredSiteUrl = process.env.VITE_PUBLIC_SITE_URL?.trim();
const siteUrl = configuredSiteUrl ? normalizeSiteUrl(configuredSiteUrl) : "";

function normalizeSiteUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "VITE_PUBLIC_SITE_URL must be an HTTPS origin without credentials or a path",
    );
  }
  return url.origin;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function createCrawlerHtml({ title, description, route, noIndex = false }) {
  const canonical = siteUrl ? `${siteUrl}${route === "/" ? "/" : route}` : "";
  const image = siteUrl ? `${siteUrl}/social-card.svg` : "/social-card.svg";
  const additions = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${noIndex ? "noindex, nofollow" : "index, follow"}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:type" content="image/svg+xml" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : "",
    canonical
      ? `<meta property="og:url" content="${escapeHtml(canonical)}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");
  const html = sourceHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*\/>/i, "")
    .replace("</head>", `    ${additions}\n  </head>`);
  return html;
}

const routes = [
  { path: "/", title: SITE_CONTENT_DEFAULTS["seo.homeTitle"] },
  {
    path: "/marketplace",
    title: SITE_CONTENT_DEFAULTS["seo.marketplaceTitle"],
  },
  { path: "/why-us", title: SITE_CONTENT_DEFAULTS["seo.whyUsTitle"] },
  { path: "/guides", title: SITE_CONTENT_DEFAULTS["seo.guidesTitle"] },
  { path: "/get-quote", title: SITE_CONTENT_DEFAULTS["seo.quoteTitle"] },
  { path: "/contact", title: SITE_CONTENT_DEFAULTS["seo.contactTitle"] },
  { path: "/blogs", title: SITE_CONTENT_DEFAULTS["seo.blogsTitle"] },
  { path: "/experts", title: SITE_CONTENT_DEFAULTS["seo.expertsTitle"] },
  { path: "/privacy", title: "Privacy notice | Material Square" },
  { path: "/terms", title: "Website terms | Material Square" },
];

for (const route of routes) {
  const directory = path.join(outputRoot, route.path.slice(1));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "index.html"),
    createCrawlerHtml({
      title: route.title,
      description: SITE_CONTENT_DEFAULTS["seo.description"],
      route: route.path,
      noIndex: route.noIndex,
    }),
  );
}

if (!siteUrl) {
  console.warn(
    "VITE_PUBLIC_SITE_URL is unset; crawler pages omit absolute canonical URLs. Set it in the production customer-site build environment.",
  );
}
