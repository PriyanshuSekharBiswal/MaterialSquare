const privateSpecificationKey = /(?:^|\s)(?:image source|price source|reference(?: note| price source| source updated| mrp)?|price observed)$/i;

export function customerSpecifications(
  specifications: Record<string, string | undefined> | null | undefined,
): Array<[string, string]> {
  return Object.entries(specifications || {}).filter(([key, value]) =>
    !privateSpecificationKey.test(key.trim()) && String(value ?? "").trim() && !/^https?:\/\//i.test(String(value).trim()),
  ) as Array<[string, string]>;
}

export function customerPriceNote(note: string | null | undefined): string {
  const value = String(note || "").trim();
  if (!value || /reference|observed|confirm local price|seller listing|local price and taxes may differ/i.test(value)) return "";
  return value;
}

export function customerProductDescription(description: string | null | undefined): string {
  const value = String(description || "").trim();
  if (!value || /online reference|reference listing|confirm the exact grade|current client price|reference price/i.test(value)) return "";
  return value;
}
