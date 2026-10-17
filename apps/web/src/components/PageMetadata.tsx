import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SEO_INDEXABLE_SERVICE_AREA_SLUGS, SEO_ROUTE_DESCRIPTIONS, SEO_SERVICE_AREA_PAGES, serviceAreaSlugs, siteSocialLinks, websitePageDescription, websitePages, parsePolicy, publicFaqEntries, type PolicyKind, type SiteContentKey } from "@material-square/types";
import { useSiteContent } from "../site-content";
import type { CatalogueProduct } from "../types";
import { customerProductDescription, customerProductTitle, customerSpecifications } from "../catalogue/customer-display";

type PublicArticleMetadata = {
  slug: string;
  title: string;
  summary: string;
  body?: string;
  featuredImageUrl: string | null;
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string | null;
};

type PublicExpertMetadata = {
  name: string;
  serviceType: string;
  expertise: string;
  city?: string | null;
  description?: string | null;
};

const titleKeys: Record<string, SiteContentKey> = {
  "/": "seo.homeTitle",
  "/marketplace": "seo.marketplaceTitle",
  "/why-us": "seo.whyUsTitle",
  "/guides": "seo.guidesTitle",
  "/get-quote": "seo.quoteTitle",
  "/contact": "seo.contactTitle",
  "/blogs": "seo.blogsTitle",
  "/experts": "seo.expertsTitle",
};

function setMeta(
  selector: string,
  attribute: "name" | "property",
  name: string,
  value: string,
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.content = value;
}

function removeMeta(selector: string) {
  document.head.querySelector(selector)?.remove();
}

function canonicalOrigin() {
  const initialCanonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )?.href;
  if (initialCanonical) {
    try {
      const url = new URL(initialCanonical);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // Fall back to the active host in local development.
    }
  }

  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (import.meta.env.PROD && configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" && !url.username && !url.password) {
        return url.origin;
      }
    } catch {
      // Fall back to the active host when the deployment value is invalid.
    }
  }
  return window.location.origin;
}

function setCanonical(pathname: string) {
  let canonical = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${canonicalOrigin()}${pathname}`;
  setMeta('meta[property="og:url"]', "property", "og:url", canonical.href);
}

function setStructuredData(value: Record<string, unknown> | null) {
  // Server preview routes emit their own page schema. Once the app is running,
  // the client owns this tag. Keep shared site entities while replacing the
  // page-specific entry so hydration does not discard organization context.
  document.head
    .querySelectorAll("#ms-product-structured-data, #ms-article-structured-data")
    .forEach((element) => element.remove());
  const id = "ms-page-structured-data";
  let script = document.head.querySelector<HTMLScriptElement>(`#${id}`);
  if (!value) {
    script?.remove();
    return;
  }
  let existingGraph: Array<Record<string, unknown>> = [];
  if (script?.textContent) {
    try {
      const existing = JSON.parse(script.textContent) as {
        "@graph"?: Array<Record<string, unknown>>;
      };
      existingGraph = Array.isArray(existing["@graph"]) ? existing["@graph"] : [];
    } catch {
      existingGraph = [];
    }
  }
  const incomingGraph = Array.isArray(value["@graph"])
    ? value["@graph"] as Array<Record<string, unknown>>
    : [value];
  const languageAwareTypes = new Set([
    "WebSite",
    "WebPage",
    "CollectionPage",
    "FAQPage",
    "BlogPosting",
  ]);
  const languageAwareGraph = incomingGraph.map((entry) => {
    const types = Array.isArray(entry["@type"])
      ? entry["@type"] as unknown[]
      : [entry["@type"]];
    return types.some((type) => typeof type === "string" && languageAwareTypes.has(type))
      ? { inLanguage: "en-IN", ...entry }
      : entry;
  });
  const sharedEntities = existingGraph.filter((entry) =>
    ["Organization", "WebSite"].some((type) =>
      Array.isArray(entry["@type"])
        ? (entry["@type"] as unknown[]).includes(type)
        : entry["@type"] === type,
    ),
  );
  const seen = new Set<string>();
  const graph = [...sharedEntities, ...languageAwareGraph].map((entry) => {
    const type = entry["@type"];
    if (type === "WebSite") return { inLanguage: "en-IN", ...entry };
    return entry;
  }).filter((entry) => {
    const key = typeof entry["@id"] === "string"
      ? entry["@id"] as string
      : `${String(entry["@type"])}:${String(entry.name || "")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    "@context": value["@context"] || "https://schema.org",
    "@graph": graph,
  }).replace(/</g, "\\u003c");
}

function hasPageStructuredData(pageId: string) {
  const script = document.head.querySelector<HTMLScriptElement>("#ms-page-structured-data");
  if (!script?.textContent) return false;
  try {
    const value = JSON.parse(script.textContent) as { "@graph"?: Array<Record<string, unknown>> };
    return Array.isArray(value["@graph"]) && value["@graph"].some((entry) => entry["@id"] === pageId);
  } catch {
    return false;
  }
}

function hasServerRenderedPageType(pageId: string, pageType: string) {
  const script = document.head.querySelector<HTMLScriptElement>("#ms-page-structured-data");
  if (!script?.textContent) return false;
  try {
    const value = JSON.parse(script.textContent) as { "@graph"?: Array<Record<string, unknown>> };
    return Array.isArray(value["@graph"]) && value["@graph"].some((entry) =>
      entry["@id"] === pageId && entry["@type"] === pageType,
    );
  } catch {
    return false;
  }
}

function setPageMetadata({
  title,
  description,
  image,
  imageAlt,
  isDefaultSocialCard,
  siteName,
}: {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  isDefaultSocialCard: boolean;
  siteName?: string;
}) {
  document.title = title;
  removeMeta('meta[property^="article:"]');
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:type"]', "property", "og:type", "website");
  setMeta('meta[property="og:site_name"]', "property", "og:site_name", siteName || "Material Square");
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[property="og:image"]', "property", "og:image", image);
  setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", imageAlt);
  if (isDefaultSocialCard) {
    setMeta('meta[property="og:image:type"]', "property", "og:image:type", "image/png");
    setMeta('meta[property="og:image:width"]', "property", "og:image:width", "1200");
    setMeta('meta[property="og:image:height"]', "property", "og:image:height", "630");
  } else {
    removeMeta('meta[property="og:image:type"]');
    removeMeta('meta[property="og:image:width"]');
    removeMeta('meta[property="og:image:height"]');
  }
  setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
  setMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", imageAlt);
}

function brief(value: string, maximum = 160) {
  const text = value.trim().replace(/\s+/g, " ");
  return text.length > maximum ? `${text.slice(0, maximum - 1).trimEnd()}…` : text;
}

function publicImageUrl(value: string | undefined, origin: string) {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (
      url.origin === origin &&
      (/^\/images\/products\/[a-z0-9-]+-illustration\.png$/i.test(url.pathname) ||
        url.pathname === "/images/materials-editorial.png")
    ) {
      url.pathname = url.pathname.replace(/\.png$/i, ".webp");
    }
    return url.href;
  } catch {
    return null;
  }
}

function formatIndianTelephone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits.startsWith("91") ? digits : `91${digits}`}`;
}

function articleAuthor(name: string, organizationName: string) {
  const normalizedName = name.trim().toLocaleLowerCase();
  const normalizedOrganization = organizationName.trim().toLocaleLowerCase();
  const isOrganization =
    normalizedName === normalizedOrganization ||
    /\b(?:editorial\s+(?:desk|team)|content\s+team)\b/i.test(name);
  return { "@type": isOrganization ? "Organization" : "Person", name: name.trim() };
}

export default function PageMetadata({ products = [], catalogueLoaded = false }: { products?: CatalogueProduct[]; catalogueLoaded?: boolean }) {
  const content = useSiteContent();
  const { pathname, search } = useLocation();

  useEffect(() => {
    const controller = new AbortController();
    const metadataOrigin = canonicalOrigin();
    const defaultImage = new URL("/social-card.png", metadataOrigin).href;
    const defaultImageAlt = "Material Square social card about construction materials, material lists and project quotations.";
    const defaultDescription = content["seo.description"];
    const policyPaths: Record<string, PolicyKind> = {
      "/privacy": "privacy",
      "/terms": "terms",
      "/shipping": "shipping",
      "/return-policy": "returns",
    };
    const policyKind = policyPaths[pathname];
    const pagePolicy = policyKind
      ? parsePolicy(content[`policy.${policyKind}`], policyKind)
      : null;
    const isUnpublishedPolicy = Boolean(pagePolicy && !pagePolicy.published);
    const isAccount = pathname === "/account" || pathname.startsWith("/account/");
    const isMaterialList = pathname === "/material-list";
    const marketplaceParams = new URLSearchParams(search);
    const isFilteredMarketplace = pathname === "/marketplace" && ["q", "category", "brand"].some((key) => Boolean(marketplaceParams.get(key)?.trim()));
    const isEmptyMarketplace = pathname === "/marketplace" && catalogueLoaded && products.length === 0;
    const isBlogIndex = pathname === "/blogs";
    const hasServerRenderedBlogIndex = isBlogIndex && hasPageStructuredData(
      `${canonicalOrigin()}/blogs#webpage`,
    );
    const hasServerRenderedBlogArticle = Boolean(
      document.head.querySelector("#ms-article-structured-data"),
    );
    const productId = pathname.match(/^\/product\/([^/]+)$/)?.[1];
    let decodedProductId = "";
    try {
      decodedProductId = productId ? decodeURIComponent(productId) : "";
    } catch {
      decodedProductId = "";
    }
    const product = productId
      ? products.find((item) => item.id === decodedProductId)
      : undefined;
    const productImageUrl = product
      ? publicImageUrl(product.image || product.galleryImages?.[0], metadataOrigin)
      : null;
    const areaMatch = pathname.match(/^\/locations\/([^/]+)$/);
    let areaSlug = "";
    try {
      areaSlug = areaMatch ? decodeURIComponent(areaMatch[1]) : "";
    } catch {
      areaSlug = "";
    }
    const area = areaSlug
      ? SEO_SERVICE_AREA_PAGES.find((candidate) => candidate.slug === areaSlug)
      : undefined;
    const isConfiguredArea = Boolean(
      area && serviceAreaSlugs(content["contact.location"]).includes(areaSlug),
    );
    const isIndexableArea = Boolean(
      isConfiguredArea && SEO_INDEXABLE_SERVICE_AREA_SLUGS.includes(areaSlug),
    );
    const managedPage = websitePages(content["website.pages"]).find(page => page.path === pathname && page.published);
    const blogMatch = pathname.match(/^\/blogs\/([^/]+)$/);
    const isBlogDetail = Boolean(blogMatch);
    const isKnownRoute = Boolean(
      titleKeys[pathname] || policyKind || pathname === "/faq" || isAccount || isMaterialList ||
      area || (productId && product) || pathname === "/blogs" || isBlogDetail || managedPage,
    );
    const title = product
      ? customerProductTitle(product.name, product.brand, content["seo.siteTitle"])
      : managedPage ? managedPage.title : pagePolicy
      ? `${pagePolicy.title} | ${content["seo.siteTitle"]}`
          : area
            ? `${isConfiguredArea ? "Construction materials in" : "Check material delivery in"} ${area.name} | ${content["seo.siteTitle"]}`
            : isAccount
          ? `Customer account | ${content["seo.siteTitle"]}`
          : content[
            titleKeys[pathname] ||
              (pathname.startsWith("/blogs/") ? "seo.blogsTitle" : "seo.siteTitle")
          ];

    setCanonical(pathname);
    const managedPageDescription = managedPage ? websitePageDescription(managedPage) : "";
    const shouldNoIndex = isAccount || isMaterialList || isUnpublishedPolicy || isFilteredMarketplace || isEmptyMarketplace || (isBlogIndex && !hasServerRenderedBlogIndex) || !isKnownRoute || (isBlogDetail && !hasServerRenderedBlogArticle) || Boolean(productId && !product) || Boolean(area && !isIndexableArea) || Boolean(managedPage && !managedPageDescription);
    const robotsValue = isFilteredMarketplace || isEmptyMarketplace
      ? "noindex, follow"
      : shouldNoIndex ? "noindex, nofollow" : "index, follow";
    if (!hasServerRenderedBlogIndex && !(isBlogDetail && hasServerRenderedBlogArticle)) {
      setMeta('meta[name="robots"]', "name", "robots", robotsValue);
    }
    const productDescription = product
      ? brief(customerProductDescription(product.description) || `${product.brand ? `${product.brand} ` : ""}${product.categoryLabel || product.category || "construction"} construction material. ${product.unit ? `Sold by ${product.unit}. ` : ""}Request a project quotation from ${content["seo.siteTitle"]}.`, 180)
      : "";
    const configuredRouteDescription = pathname === "/why-us"
      ? content["whyUs.description"]
      : pathname === "/guides"
        ? content["guides.description"]
        : pathname === "/get-quote"
          ? content["getQuote.description"]
          : pathname === "/contact"
            ? content["contact.description"]
          : "";
    const pageDescription = pathname === "/"
      ? brief(content["seo.description"].trim() || SEO_ROUTE_DESCRIPTIONS["/"])
      : area && isConfiguredArea
        ? brief(area.description)
        : brief(configuredRouteDescription.trim()) || SEO_ROUTE_DESCRIPTIONS[pathname] || defaultDescription;
    const metadataDescription = area && !isConfiguredArea
      ? brief(`Check material delivery coverage for ${area.name}. Share your site PIN code so the team can confirm whether products and delivery are available.`)
      : pageDescription;
    const hasServerRenderedArticleNotFound =
      isBlogDetail && document.title.startsWith("Article not found |");
    if (!(isBlogDetail && (hasServerRenderedBlogArticle || hasServerRenderedArticleNotFound))) {
      setPageMetadata({
        title,
        description: productDescription || managedPageDescription || metadataDescription,
        image: productImageUrl || defaultImage,
        imageAlt: productImageUrl ? product!.name : defaultImageAlt,
        isDefaultSocialCard: !productImageUrl,
        siteName: content["seo.siteTitle"],
      });
    }
    if (pathname === "/") {
      const siteUrl = canonicalOrigin();
      const contactPhone = formatIndianTelephone(content["contact.phone"]);
      const coveredAreaSlugs = new Set(serviceAreaSlugs(content["contact.location"]));
      const coveredAreas = SEO_SERVICE_AREA_PAGES
        .filter((areaPage) => coveredAreaSlugs.has(areaPage.slug))
        .map((areaPage) => areaPage.name);
      const officialProfiles = siteSocialLinks(content)
        .map(({ url }) => url);
      setStructuredData({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`,
            name: content["seo.siteTitle"],
            url: `${siteUrl}/`,
            logo: `${siteUrl}/favicon.png`,
            description: pageDescription,
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
              ...(contactPhone ? { telephone: contactPhone } : {}),
              ...(content["contact.email"]
                ? { email: content["contact.email"] }
                : {}),
              url: `${siteUrl}/contact`,
            },
            ...(coveredAreas.length
              ? {
                  areaServed: coveredAreas.map((name) => ({
                    "@type": "City",
                    name,
                  })),
                }
              : {}),
          },
          {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                name: content["seo.siteTitle"],
                url: `${siteUrl}/`,
                inLanguage: "en-IN",
                publisher: { "@id": `${siteUrl}/#organization` },
          },
        ],
      });
    } else if (pathname === "/marketplace") {
      const canonical = `${canonicalOrigin()}/marketplace`;
      const pageSchema = isFilteredMarketplace || !catalogueLoaded
        ? {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: content["seo.marketplaceTitle"],
            description: pageDescription,
          }
        : {
            "@type": "CollectionPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: content["seo.marketplaceTitle"],
            description: pageDescription,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: products.length,
              itemListElement: products.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${canonicalOrigin()}/product/${encodeURIComponent(item.id)}`,
                name: item.name,
              })),
            },
      };
      if (catalogueLoaded || !hasPageStructuredData(`${canonical}#webpage`)) {
        setStructuredData({
          "@context": "https://schema.org",
          "@graph": [
            pageSchema,
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
                { "@type": "ListItem", position: 2, name: "Construction materials", item: canonical },
              ],
            },
          ],
        });
      }
    } else if (pathname === "/blogs") {
      const canonical = `${canonicalOrigin()}/blogs`;
      const articleListSchema = (articles: PublicArticleMetadata[]) => ({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: content["seo.blogsTitle"],
            description: pageDescription,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: articles.length,
              itemListElement: articles.map((article, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${canonicalOrigin()}/blogs/${encodeURIComponent(article.slug)}`,
                name: article.title,
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
              { "@type": "ListItem", position: 2, name: "Articles", item: canonical },
            ],
          },
        ],
      });
      if (!hasPageStructuredData(`${canonical}#webpage`)) {
        setStructuredData({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${canonical}#webpage`,
              url: canonical,
              name: content["seo.blogsTitle"],
              description: pageDescription,
              isPartOf: { "@id": `${canonicalOrigin()}/#website` },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
                { "@type": "ListItem", position: 2, name: "Articles", item: canonical },
              ],
            },
          ],
        });
      }
      fetch(`${import.meta.env.VITE_API_URL || "/api"}/blogs?page=1`, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal,
      })
        .then((response) => {
          if (response.status === 404) return [];
          if (!response.ok) throw new Error("Article list is temporarily unavailable");
          return response.json() as Promise<PublicArticleMetadata[]>;
        })
        .then((articles) => {
          if (!articles || controller.signal.aborted) return;
          if (articles.length) {
            setMeta('meta[name="robots"]', "name", "robots", "index, follow");
            setStructuredData(articleListSchema(articles));
          } else {
            setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
            setStructuredData({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebPage",
                  "@id": `${canonical}#webpage`,
                  url: canonical,
                  name: content["seo.blogsTitle"],
                  description: pageDescription,
                },
                {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
                    { "@type": "ListItem", position: 2, name: "Articles", item: canonical },
                  ],
                },
              ],
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && !hasServerRenderedBlogIndex) {
            setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
          }
        });
    } else if (pathname === "/experts") {
      const canonical = `${canonicalOrigin()}/experts`;
      const breadcrumbSchema = {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
          { "@type": "ListItem", position: 2, name: "Experts and services", item: canonical },
        ],
      };
      const hasServerRenderedExperts = hasServerRenderedPageType(
        `${canonical}#webpage`,
        "CollectionPage",
      );
      if (!hasPageStructuredData(`${canonical}#webpage`)) {
        setStructuredData({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${canonical}#webpage`,
              url: canonical,
              name: content["seo.expertsTitle"],
              description: pageDescription,
              isPartOf: { "@id": `${canonicalOrigin()}/#website` },
            },
            breadcrumbSchema,
          ],
        });
      }
      fetch(`${import.meta.env.VITE_API_URL || "/api"}/experts`, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Expert directory is temporarily unavailable");
          return response.json() as Promise<PublicExpertMetadata[]>;
        })
        .then((experts) => {
          if (controller.signal.aborted) return;
          if (!experts.length) setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
          setStructuredData({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": experts.length ? "CollectionPage" : "WebPage",
                "@id": `${canonical}#webpage`,
                url: canonical,
                name: content["seo.expertsTitle"],
                description: pageDescription,
                ...(experts.length ? {
                  mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: experts.length,
                    itemListElement: experts.map((expert, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      name: expert.name,
                      description: [expert.serviceType, expert.city, expert.expertise, expert.description].filter(Boolean).join(" · "),
                    })),
                  },
                } : {}),
              },
              breadcrumbSchema,
            ],
          });
        })
        .catch(() => {
          if (!controller.signal.aborted && !hasServerRenderedExperts) {
            setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
          }
        });
    } else if (managedPage && managedPageDescription) {
      const canonical = `${canonicalOrigin()}${pathname}`;
      setStructuredData({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: managedPage.title,
        ...(managedPage.description ? { description: managedPage.description } : {}),
        isPartOf: { "@id": `${canonicalOrigin()}/#website` },
      });
    } else if (product) {
      const canonical = `${canonicalOrigin()}${pathname}`;
      setStructuredData({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Product",
            "@id": `${canonical}#product`,
            url: canonical,
            mainEntityOfPage: canonical,
            name: product.name,
            ...(customerProductDescription(product.description)
              ? { description: brief(customerProductDescription(product.description), 180) }
              : {}),
            ...(product.code ? { sku: product.code } : {}),
            ...(product.categoryLabel || product.category
              ? { category: product.categoryLabel || product.category }
              : {}),
            ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
            ...(productImageUrl ? { image: [productImageUrl] } : {}),
            ...(customerSpecifications(product.specs).length
              ? {
                  additionalProperty: customerSpecifications(product.specs).map(([name, value]) => ({
                    "@type": "PropertyValue",
                    name,
                    value,
                  })),
                }
              : {}),
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "Construction materials",
                item: `${canonicalOrigin()}/marketplace`,
              },
              { "@type": "ListItem", position: 3, name: product.name, item: canonical },
            ],
          },
        ],
      });
    } else if (area && isIndexableArea) {
      const canonical = `${canonicalOrigin()}${pathname}`;
      const origin = canonicalOrigin();
      setStructuredData({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: `Construction materials in ${area.name}`,
            about: { "@type": "City", name: area.name },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "Construction materials",
                item: `${origin}/marketplace`,
              },
              { "@type": "ListItem", position: 3, name: area.name, item: canonical },
            ],
          },
        ],
      });
    } else if (pathname === "/marketplace") {
      const canonical = `${canonicalOrigin()}/marketplace`;
      const faqEntries = publicFaqEntries(content);
      setStructuredData({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            description: metadataDescription,
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: products.length,
              itemListElement: products.map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${canonicalOrigin()}/product/${encodeURIComponent(product.id)}`,
                name: product.name,
              })),
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
              { "@type": "ListItem", position: 2, name: "Construction materials", item: canonical },
            ],
          },
          ...(faqEntries.length ? [{
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            mainEntity: faqEntries.map((entry) => ({
              "@type": "Question",
              name: entry.question,
              acceptedAnswer: { "@type": "Answer", text: entry.answer },
            })),
          }] : []),
        ],
      });
    } else if (pathname === "/contact") {
      const canonical = `${canonicalOrigin()}/contact`;
      const faqEntries = publicFaqEntries(content);
      setStructuredData({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            description: metadataDescription,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
              { "@type": "ListItem", position: 2, name: title, item: canonical },
            ],
          },
          ...(faqEntries.length ? [{
            "@type": "FAQPage",
            "@id": `${canonical}#faq`,
            mainEntity: faqEntries.map((entry) => ({
              "@type": "Question",
              name: entry.question,
              acceptedAnswer: { "@type": "Answer", text: entry.answer },
            })),
          }] : []),
        ],
      });
    } else if (isBlogDetail && hasServerRenderedBlogArticle) {
      // Keep the server article schema while the client refreshes its metadata.
    } else if (!shouldNoIndex && isKnownRoute) {
      const canonical = `${canonicalOrigin()}${pathname}`;
      const breadcrumbName = pathname === "/why-us"
        ? content["whyUs.title"]
        : pathname === "/guides"
          ? content["guides.title"]
          : content["getQuote.title"];
      setStructuredData({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            description: metadataDescription,
            isPartOf: { "@id": `${canonicalOrigin()}/#website` },
          },
          ...(breadcrumbName ? [{
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
              { "@type": "ListItem", position: 2, name: breadcrumbName, item: canonical },
            ],
          }] : []),
        ],
      });
    } else {
      setStructuredData(null);
    }

    if (blogMatch) {
      const slug = encodeURIComponent(blogMatch[1]);
      fetch(`${import.meta.env.VITE_API_URL || "/api"}/blogs/${slug}`, {
        headers: { Accept: "application/json" },
        credentials: "omit",
        signal: controller.signal,
      })
        .then((response) => {
          if (response.status === 404) return null;
          if (!response.ok) throw new Error("Article is temporarily unavailable");
          return response.json() as Promise<PublicArticleMetadata>;
        })
        .then((article) => {
          if (controller.signal.aborted) return;
          if (!article) {
            setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
            return;
          }
          setMeta('meta[name="robots"]', "name", "robots", "index, follow");
          const articleTitle = `${article.title} | ${content["seo.siteTitle"]}`;
          const articleImageUrl = publicImageUrl(
            article.featuredImageUrl || undefined,
            metadataOrigin,
          );
          const image = articleImageUrl || defaultImage;
          const articleCanonical = `${canonicalOrigin()}${pathname}`;
          setPageMetadata({
            title: articleTitle,
            description: brief(article.summary) || defaultDescription,
            image,
            imageAlt: articleImageUrl ? article.title : defaultImageAlt,
            isDefaultSocialCard: !articleImageUrl,
            siteName: content["seo.siteTitle"],
          });
          setMeta('meta[property="og:type"]', "property", "og:type", "article");
          if (article.publishedAt)
            setMeta(
              'meta[property="article:published_time"]',
              "property",
              "article:published_time",
              article.publishedAt,
            );
          if (article.updatedAt)
            setMeta(
              'meta[property="article:modified_time"]',
              "property",
              "article:modified_time",
              article.updatedAt,
            );
          setStructuredData({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BlogPosting",
                "@id": `${articleCanonical}#article`,
                inLanguage: "en-IN",
                headline: article.title,
                description: brief(article.summary),
                ...(article.body?.trim() ? { articleBody: article.body.trim() } : {}),
                ...(articleImageUrl ? { image: [articleImageUrl] } : {}),
                mainEntityOfPage: articleCanonical,
                publisher: {
                  "@type": "Organization",
                  "@id": `${canonicalOrigin()}/#organization`,
                  name: content["seo.siteTitle"],
                  logo: { "@type": "ImageObject", url: `${canonicalOrigin()}/favicon.png` },
                },
                ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
                ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
                ...(article.authorName
                  ? { author: articleAuthor(article.authorName, content["seo.siteTitle"]) }
                  : {}),
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: `${canonicalOrigin()}/` },
                  { "@type": "ListItem", position: 2, name: "Articles", item: `${canonicalOrigin()}/blogs` },
                  { "@type": "ListItem", position: 3, name: article.title, item: articleCanonical },
                ],
              },
            ],
          });
        })
        .catch(() => {
          if (!controller.signal.aborted && !hasServerRenderedBlogArticle) {
            setMeta('meta[name="robots"]', "name", "robots", "noindex, nofollow");
          }
        });
    }

    return () => controller.abort();
  }, [catalogueLoaded, content, pathname, products, search]);

  return null;
}
