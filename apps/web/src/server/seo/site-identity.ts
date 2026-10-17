import {
  siteSocialLinks,
  SEO_SERVICE_AREA_PAGES,
  serviceAreaSlugs,
} from "./runtime-types.js";

type SiteContentValues = Record<string, unknown>;
type SchemaEntry = Record<string, unknown>;

function text(content: SiteContentValues, key: string) {
  return typeof content[key] === "string" ? (content[key] as string).trim() : "";
}

function isSharedEntity(entry: SchemaEntry) {
  const types = Array.isArray(entry["@type"]) ? entry["@type"] : [entry["@type"]];
  return types.includes("Organization") || types.includes("WebSite");
}

/** Replace build-time site identity with the current public business details. */
export function setSiteIdentityStructuredData(
  html: string,
  origin: string,
  content: SiteContentValues,
) {
  const siteTitle = text(content, "seo.siteTitle") || "Material Square";
  const description = text(content, "seo.description");
  const officeAddress = text(content, "contact.officeAddress");
  const phoneDigits = text(content, "contact.phone").replace(/\D/g, "");
  const phone = phoneDigits
    ? `+${phoneDigits.startsWith("91") ? phoneDigits : `91${phoneDigits}`}`
    : "";
  const areas = serviceAreaSlugs(text(content, "contact.location"));
  const socialProfiles = siteSocialLinks(content)
    .map(({ url }) => url);
  const organization: SchemaEntry = {
    "@type": "Organization",
    "@id": `${origin}/#organization`,
    name: siteTitle,
    url: `${origin}/`,
    logo: { "@type": "ImageObject", url: `${origin}/favicon.png` },
    ...(description ? { description } : {}),
    ...(officeAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: officeAddress,
            addressCountry: "IN",
          },
        }
      : {}),
    ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      ...(phone ? { telephone: phone } : {}),
      ...(text(content, "contact.email")
        ? { email: text(content, "contact.email") }
        : {}),
      url: `${origin}/contact`,
    },
    ...(areas.length
      ? {
          areaServed: SEO_SERVICE_AREA_PAGES
            .filter((area) => areas.includes(area.slug))
            .map((area) => ({ "@type": "City", name: area.name })),
        }
      : {}),
  };
  const website: SchemaEntry = {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: siteTitle,
    url: `${origin}/`,
    inLanguage: "en-IN",
    publisher: { "@id": `${origin}/#organization` },
  };

  const pattern = /<script\s+id=["']ms-page-structured-data["'][^>]*>([\s\S]*?)<\/script>/i;
  const match = html.match(pattern);
  let graph: SchemaEntry[] = [];
  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1]) as { "@graph"?: SchemaEntry[] };
      graph = Array.isArray(parsed["@graph"]) ? parsed["@graph"] : [];
    } catch {
      graph = [];
    }
  }
  const updatedGraph = [...graph.filter((entry) => !isSharedEntity(entry)), organization, website];
  const script = `<script id="ms-page-structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": updatedGraph }).replace(/</g, "\\u003c")}</script>`;
  return match
    ? html.replace(match[0], script)
    : html.replace("</head>", `  ${script}\n</head>`);
}
