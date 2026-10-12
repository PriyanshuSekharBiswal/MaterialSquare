const fs = require("node:fs");
const path = require("node:path");
const {
  serviceAreaSlugs,
  SEO_ROUTE_DESCRIPTIONS,
  SITE_CONTENT_DEFAULTS,
} = require("@material-square/types");

const outputRoot = path.resolve("dist");
const sourceHtml = fs.readFileSync(path.join(outputRoot, "index.html"), "utf8");
const deploymentEnvironment =
  process.env.VERCEL_ENV?.trim() || process.env.VITE_VERCEL_ENV?.trim();
const isPreviewDeployment = deploymentEnvironment
  ? deploymentEnvironment !== "production"
  : process.env.NODE_ENV !== "production";
const vercelProductionDomain =
  process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
  process.env.VITE_VERCEL_PROJECT_PRODUCTION_URL?.trim();
const configuredSiteUrl = isPreviewDeployment
  ? process.env.VERCEL_URL?.trim()
    ? `https://${process.env.VERCEL_URL.trim()}`
    : ""
  : process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    (vercelProductionDomain ? `https://${vercelProductionDomain}` : "");
const siteUrl = configuredSiteUrl ? normalizeSiteUrl(configuredSiteUrl) : "";
const configuredServiceAreaSlugs = serviceAreaSlugs(
  SITE_CONTENT_DEFAULTS["contact.location"],
);

if (process.env.VERCEL_ENV === "production" && !siteUrl) {
  throw new Error(
    "Production crawler pages require the approved public site URL. Set PUBLIC_SITE_URL, VITE_PUBLIC_SITE_URL, or enable VERCEL_PROJECT_PRODUCTION_URL.",
  );
}

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
  const image = siteUrl ? `${siteUrl}/social-card.png` : "/social-card.png";
  const routeSchemas = [];
  if (siteUrl) {
    routeSchemas.push(
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Material Square",
        url: `${siteUrl}/`,
        logo: `${siteUrl}/favicon.png`,
        description: SITE_CONTENT_DEFAULTS["seo.description"],
        ...(SITE_CONTENT_DEFAULTS["contact.officeAddress"]
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: SITE_CONTENT_DEFAULTS["contact.officeAddress"],
                addressCountry: "IN",
              },
            }
          : {}),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          ...(SITE_CONTENT_DEFAULTS["contact.phone"]
            ? {
                telephone: `+91${SITE_CONTENT_DEFAULTS["contact.phone"].replace(/\D/g, "")}`,
              }
            : {}),
          ...(SITE_CONTENT_DEFAULTS["contact.email"]
            ? { email: SITE_CONTENT_DEFAULTS["contact.email"] }
            : {}),
          url: `${siteUrl}/contact`,
        },
        ...(configuredServiceAreaSlugs.length
          ? {
              areaServed: configuredServiceAreaSlugs.map((slug) => ({
                "@type": "City",
                name: seoAreaNames[slug],
              })),
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: "Material Square",
        url: `${siteUrl}/`,
        inLanguage: "en-IN",
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
    );
  }
  const routeStructuredData = routeSchemas.length
    ? `<script id="ms-page-structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": routeSchemas }).replace(/</g, "\\u003c")}</script>`
    : "";
  const additions = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${noIndex ? "noindex, nofollow" : "index, follow"}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Material Square social card about construction materials, material lists and project quotations." />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:image:alt" content="Material Square social card about construction materials, material lists and project quotations." />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : "",
    canonical
      ? `<meta property="og:url" content="${escapeHtml(canonical)}" />`
      : "",
    `<noscript><style>.boot-loading{display:none!important}.seo-static-fallback{max-width:72rem;margin:3rem auto;padding:2rem;color:#172033;font:1rem/1.6 Inter,Arial,sans-serif}.seo-static-fallback h1{font-size:2rem;line-height:1.2}.seo-static-fallback nav{display:flex;gap:1rem;margin-top:1.5rem}</style></noscript>`,
  ]
    .filter(Boolean)
    .join("\n    ");
  const html = sourceHtml
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description"[^>]*\/>/i, "")
    .replace("</head>", `    ${additions}\n    ${routeStructuredData}\n  </head>`);
  const fallback = `<noscript><main class="seo-static-fallback"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><nav aria-label="Primary"><a href="/marketplace">Browse materials</a><a href="/get-quote">Request a quotation</a><a href="/contact">Contact Material Square</a></nav></main></noscript>`;
  return html.replace(/(<div\s+id=["']root["'][^>]*>)/i, `$1${fallback}`);
}

const routes = [
  { path: "/", title: SITE_CONTENT_DEFAULTS["seo.homeTitle"] },
  {
    path: "/material-list",
    title: "Material list | Material Square",
    noIndex: true,
  },
];

for (const route of routes) {
  const directory = path.join(outputRoot, route.path.slice(1));
  fs.mkdirSync(directory, { recursive: true });
  const outputPath = route.path === "/"
    ? path.join(outputRoot, "__app-shell.html")
    : path.join(directory, "index.html");
  fs.writeFileSync(
    outputPath,
    createCrawlerHtml({
      title: route.title,
      description: route.description || SEO_ROUTE_DESCRIPTIONS[route.path] || SITE_CONTENT_DEFAULTS["seo.description"],
      route: route.path,
      noIndex: Boolean(
        route.noIndex || isPreviewDeployment,
      ),
    }),
  );
}

// The dynamic homepage rewrite must own `/`; leave the generated client shell
// at a private-looking static path for server-rendered route handlers.
fs.rmSync(path.join(outputRoot, "index.html"), { force: true });

if (!siteUrl) {
  console.warn(
    "No public site URL was found; crawler pages omit absolute canonical URLs. Set PUBLIC_SITE_URL or VITE_PUBLIC_SITE_URL, or enable Vercel system environment variables for VERCEL_PROJECT_PRODUCTION_URL.",
  );
}
