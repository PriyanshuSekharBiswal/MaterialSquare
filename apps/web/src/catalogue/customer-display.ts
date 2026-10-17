const privateSpecificationKey = /(?:^|\s)(?:image source|price source|reference(?: note| price source| source updated| mrp)?|price observed)$/i;
const internalCatalogueCopy = /(?:online reference|reference listing|source listing|rate can change|confirm.{0,80}(?:price|availability|ordering)|(?:price|availability).{0,80}confirm|local availability|availability before ordering|seller reference|manufacturer mrp reference|reference price)/i;

export function customerProductTitle(
  name: string,
  brand: string | null | undefined,
  siteTitle: string,
): string {
  const cleanBrand = String(brand || "").trim();
  const brandAlreadyInName = cleanBrand && name.toLocaleLowerCase().includes(cleanBrand.toLocaleLowerCase());
  return `${name}${cleanBrand && !brandAlreadyInName ? ` by ${cleanBrand}` : ""} | ${siteTitle}`;
}

export function customerSpecifications(
  specifications: Record<string, string | undefined> | null | undefined,
): Array<[string, string]> {
  return Object.entries(specifications || {}).filter(([key, value]) =>
    !privateSpecificationKey.test(key.trim()) && String(value ?? "").trim() && !/^https?:\/\//i.test(String(value).trim()),
  ) as Array<[string, string]>;
}

export function customerPriceNote(note: string | null | undefined): string {
  const value = String(note || "").trim();
  if (!value || internalCatalogueCopy.test(value)) return "";
  return value;
}

export function customerProductDescription(description: string | null | undefined): string {
  const value = String(description || "").trim();
  if (!value || internalCatalogueCopy.test(value)) return "";
  return value;
}

export function customerCardFeatures(features: string[] | null | undefined): string[] {
  return (features || []).filter((feature) => !internalCatalogueCopy.test(String(feature || "")));
}
