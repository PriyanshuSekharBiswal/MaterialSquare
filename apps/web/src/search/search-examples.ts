import type { CatalogueProduct } from "../types";

const cleanExample = (value: unknown) => {
  const example = String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (example.length < 3 || example.length > 30 || /^[\d\s.,/-]+$/.test(example)) return "";
  return example;
};

/** Build varied rotating queries from fields the catalogue search actually indexes. */
export function buildSearchExamples(products: CatalogueProduct[], limit = 24) {
  const categories = [...new Set(products.map((product) => cleanExample(product.categoryLabel.split("&")[0])))];
  const names = products.map((product) => cleanExample(product.name));
  const brands = products.map((product) => cleanExample(product.brand));
  const details = products.flatMap((product) => [
    ...product.features,
    ...product.applications,
    ...Object.entries(product.specs || {}).map(([key, value]) => `${key} ${value || ""}`),
    ...(product.variants || []).flatMap((variant) => [
      variant.label,
      ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key} ${value}`),
    ]),
  ].map(cleanExample));

  const examples: string[] = [];
  const seen = new Set<string>();
  const add = (example: string) => {
    const key = example.toLocaleLowerCase();
    if (!example || seen.has(key)) return;
    seen.add(key);
    examples.push(example);
  };

  const rounds = Math.max(categories.length, names.length, brands.length, details.length);
  for (let index = 0; index < rounds && examples.length < limit; index += 1) {
    add(categories[index] || "");
    add(names[index] || "");
    add(brands[index] || "");
    add(details[index] || "");
  }

  return examples.slice(0, limit);
}
