import type { CatalogueProduct } from "../types";

const cleanExample = (value: unknown) => {
  const rawExample = String(value || "").trim().replace(/\s+/g, " ");
  if (rawExample.length < 3 || /^[\d\s.,/-]+$/.test(rawExample)) return "";
  if (rawExample.length <= 48) return rawExample;
  const shortExample = rawExample.slice(0, 45).replace(/\s+\S*$/, "").trim();
  return shortExample.length >= 3 ? `${shortExample}…` : "";
};

/** Build varied rotating queries from fields the catalogue search actually indexes. */
export function buildSearchExamples(products: CatalogueProduct[], limit = 60) {
  const categories = [...new Set(products.map((product) => cleanExample(product.categoryLabel)))];
  const names = products.map((product) => cleanExample(product.name));
  const brands = products.map((product) => cleanExample(product.brand));
  const brandSpecifications = products.flatMap((product) => [product.grade, product.packaging]
    .map((value) => cleanExample(value ? `${product.brand} ${value}` : "")));
  const specifications = products.flatMap((product) => [
    product.grade,
    product.packaging,
    ...Object.entries(product.specs || {}).flatMap(([key, value]) => [value, `${key} ${value || ""}`]),
    ...(product.variants || []).flatMap((variant) => [
      variant.label,
      ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key} ${value}`),
    ]),
  ].map(cleanExample));
  const usesAndFeatures = products.flatMap((product) => [
    ...product.features,
    ...product.applications,
  ].map(cleanExample));

  const examples: string[] = [];
  const seen = new Set<string>();
  const add = (example: string) => {
    const key = example.toLocaleLowerCase();
    if (!example || seen.has(key)) return;
    seen.add(key);
    examples.push(example);
  };

  // Show the actual catalogue names and brands first, then broaden into categories,
  // sizes, grades, finishes, applications and other indexed discovery terms.
  for (const example of names) add(example || "");
  for (const example of brands) add(example || "");

  const rounds = Math.max(categories.length, brandSpecifications.length, specifications.length, usesAndFeatures.length);
  for (let index = 0; index < rounds && examples.length < limit; index += 1) {
    add(categories[index] || "");
    add(brandSpecifications[index] || "");
    add(specifications[index] || "");
    add(usesAndFeatures[index] || "");
  }

  return examples.slice(0, limit);
}
