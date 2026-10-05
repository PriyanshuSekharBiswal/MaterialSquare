import type { CatalogueProduct, CatalogueVariant } from "../types";

const normalize = (value: unknown) => String(value || "").normalize("NFKD").toLocaleLowerCase().replace(/(\d)\s+(l|ml|kg|g|mm|cm|m)\b/g, "$1$2").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Return the variant most specifically described by a search query. */
export function bestMatchingVariant(product: CatalogueProduct, query: string): CatalogueVariant | undefined {
  const queryTokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return undefined;
  const parentText = normalize([product.name, product.brand, product.category, product.categoryLabel, product.code, product.grade, product.packaging, product.unit].join(" "));
  const tokens = queryTokens.filter((token) => !parentText.split(" ").some((part) => part.includes(token)));
  if (!tokens.length) return undefined;
  const matches = (product.variants || []).map((variant) => {
    const text = normalize([variant.label, variant.code, variant.unit, ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value])].join(" "));
    const hits = tokens.filter((token) => text.split(" ").some((part) => part.includes(token))).length;
    const exact = tokens.filter((token) => text.split(" ").includes(token)).length;
    const inStock = variant.availabilityStatus ? variant.availabilityStatus === "IN_STOCK" : variant.inStock;
    return { variant, hits, exact, inStock };
  }).filter((row) => row.hits === tokens.length).sort((a, b) => b.exact - a.exact || Number(b.inStock) - Number(a.inStock) || a.variant.sortOrder - b.variant.sortOrder);
  return matches[0]?.variant;
}

export function variantSearchText(variant: CatalogueVariant) {
  return normalize([variant.label, variant.code, variant.unit, ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value])].join(" "));
}
