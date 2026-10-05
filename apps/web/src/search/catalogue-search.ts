import type { CatalogueProduct, CatalogueVariant } from '../types';

const normalize = (value: unknown) => String(value || '').normalize('NFKD').toLocaleLowerCase().replace(/(\d)\s+(l|ml|kg|g|mm|cm|m)\b/g, '$1$2').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Search the catalogue fields customers use to identify a material.
 * Keep this shared by submitted search and autocomplete so both return the
 * same products for brands, variants, colours, finishes, sizes, and specs.
 */
export function matchesCatalogueSearch(product: CatalogueProduct, query: string): boolean {
  const term = normalize(query);
  if (!term) return true;

  const searchableValues = [
    product.name,
    product.brand,
    product.brandTagline,
    product.code,
    product.grade,
    product.category,
    product.categoryLabel,
    product.unit,
    product.packaging,
    product.minOrderQty,
    product.description,
    ...product.features,
    ...product.applications,
    ...Object.entries(product.specs || {}).flatMap(([key, value]) => [key, value]),
  ];

  const normalizedValues = searchableValues.map(normalize);
  const tokens = term.split(/\s+/).filter(Boolean);
  const variantTexts = (product.variants || []).map((variant) => [
    variant.label,
    variant.code,
    variant.unit,
    ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value]),
  ].map(normalize).join(' '));
  const variantOnlyTokens = tokens.filter((token) => !normalizedValues.some((value) => value.includes(token)));
  return tokens.every((token) => normalizedValues.some((value) => value.includes(token)))
    || (variantOnlyTokens.length > 0 && variantTexts.some((text) => variantOnlyTokens.every((token) => text.includes(token))));
}

/** Rank an already-matched catalogue result so exact product/variant intent wins. */
export function scoreCatalogueSearch(product: CatalogueProduct, query: string): number {
  const term = normalize(query);
  const tokens = term.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;

  const name = normalize(product.name);
  const brand = normalize(product.brand);
  const code = normalize(product.code);
  const parentValues = [
    product.name, product.brand, product.brandTagline, product.code, product.grade,
    product.category, product.categoryLabel, product.unit, product.packaging,
    product.description, ...product.features, ...product.applications,
    ...Object.entries(product.specs || {}).flatMap(([key, value]) => [key, value]),
  ].map(normalize);
  const allTokensMatch = (value: string) => tokens.every((token) => value.includes(token));
  const parentMatch = (values: string[]) => values.some(allTokensMatch);
  const parentTokens = tokens.filter((token) => parentValues.some((value) => value.includes(token)));
  const variantOnlyTokens = tokens.filter((token) => !parentValues.some((value) => value.includes(token)));
  const normalizedVariant = (variant: CatalogueVariant) => normalize([
    variant.label, variant.code, variant.unit,
    ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value]),
  ].join(" "));

  let score = 0;
  if (allTokensMatch(name)) score = Math.max(score, 1000 + (name.includes(term) ? 100 : 0));
  if (allTokensMatch(brand)) score = Math.max(score, 900 + (brand.includes(term) ? 100 : 0));
  if (allTokensMatch(code)) score = Math.max(score, 875 + (code === term ? 100 : 0));
  if (tokens.every((token) => parentValues.some((value) => value.includes(token)))) {
    score = Math.max(score, 700 + (parentMatch(parentValues) ? 30 : 0));
  }

  for (const variant of product.variants || []) {
    const text = normalizedVariant(variant);
    if (!variantOnlyTokens.length || !variantOnlyTokens.every((token) => text.includes(token))) continue;
    const status = variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
    score = Math.max(score, 760 + parentTokens.length * 12 + (allTokensMatch(text) ? 20 : 0) + (status === "IN_STOCK" ? 10 : 0));
  }
  return score;
}
