import type { CatalogueProduct } from '../types';

/**
 * Search the catalogue fields customers use to identify a material.
 * Keep this shared by submitted search and autocomplete so both return the
 * same products for brands, variants, colours, finishes, sizes, and specs.
 */
export function matchesCatalogueSearch(product: CatalogueProduct, query: string): boolean {
  const term = query.trim().toLocaleLowerCase();
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
    ...(product.variants || []).flatMap((variant) => [
      variant.label,
      variant.code,
      variant.unit,
      ...Object.entries(variant.attributes || {}).flatMap(([key, value]) => [key, value]),
    ]),
  ];

  return searchableValues.some((value) => String(value || '').toLocaleLowerCase().includes(term));
}
