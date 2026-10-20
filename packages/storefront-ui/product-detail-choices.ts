import type { ProductDetailChoiceGroup } from "./ProductDetailSurface";

export type ProductDetailVariantOption = {
  label: string;
  id?: string | null;
  draftKey?: string;
  attributes?: Record<string, string | null | undefined> | null;
  price?: number | string | null;
  offerLabel?: string | null;
  image?: string | null;
  availabilityStatus?: string | null;
  inStock?: boolean;
  sortOrder?: number;
};

export function buildProductDetailChoiceGroups<T extends ProductDetailVariantOption>(
  variants: T[],
  selectedVariant: T | undefined,
  onSelect: (variant: T) => void,
  fallbackPrice?: number | string | null,
): ProductDetailChoiceGroup[] {
  if (!variants.length) return [];

  const groups = new Map<string, { label: string; values: string[] }>();
  for (const variant of variants) {
    for (const [rawKey, rawValue] of Object.entries(variant.attributes || {})) {
      const label = rawKey.trim();
      const value = String(rawValue || "").trim();
      if (!label || !value) continue;
      const key = label.toLocaleLowerCase();
      const group = groups.get(key) || { label, values: [] };
      if (!group.values.some((existing) => existing.toLocaleLowerCase() === value.toLocaleLowerCase())) {
        group.values.push(value);
      }
      groups.set(key, group);
    }
  }

  const signatures = variants.map((variant) => JSON.stringify(
    Object.entries(variant.attributes || {})
      .map(([key, value]) => [key.trim().toLocaleLowerCase(), String(value || "").trim().toLocaleLowerCase()])
      .sort(([left], [right]) => left.localeCompare(right)),
  ));
  if (variants.length > 1 && (!groups.size || new Set(signatures).size < variants.length)) {
    const labels = Array.from(new Set(variants.map((variant) => variant.label.trim()).filter(Boolean)));
    if (labels.length > 1) groups.set("__variant", { label: "Option", values: labels });
  }

  const preferred = [...groups.entries()].find(([key]) => /size|unit|pack|volume|capacity|weight/i.test(key));
  const primaryKey = preferred?.[0] || groups.keys().next().value;
  const orderedGroups = [...groups.entries()].sort(([left], [right]) =>
    left === primaryKey ? -1 : right === primaryKey ? 1 : 0,
  );

  return orderedGroups.map(([key, group]) => {
    const selectedValue = key === "__variant"
      ? selectedVariant?.label || ""
      : Object.entries(selectedVariant?.attributes || {}).find(([attribute]) =>
          attribute.trim().toLocaleLowerCase() === key,
        )?.[1] || "";
    const label = key === preferred?.[0] && /^(size|unit|pack|volume|capacity|weight)s?$/i.test(key)
      ? "Unit"
      : group.label;

    return {
      label,
      presentation: key === primaryKey ? "cards" as const : "select" as const,
      selectedValue: String(selectedValue),
      choices: group.values.map((value) => {
        const matches = key === "__variant"
          ? variants.filter((variant) => variant.label.trim() === value)
          : variants.filter((variant) => Object.entries(variant.attributes || {}).some(([attribute, candidate]) =>
              attribute.trim().toLocaleLowerCase() === key &&
              String(candidate || "").toLocaleLowerCase() === value.toLocaleLowerCase(),
            ));
        const variant = matches.sort((left, right) => {
          const score = (candidate: T) => Object.entries(selectedVariant?.attributes || {}).filter(([attribute, selected]) =>
            attribute.trim().toLocaleLowerCase() !== key &&
            Object.entries(candidate.attributes || {}).some(([other, candidateValue]) =>
              other.trim().toLocaleLowerCase() === attribute.trim().toLocaleLowerCase() &&
              String(candidateValue || "").toLocaleLowerCase() === String(selected || "").toLocaleLowerCase(),
            ),
          ).length;
          const available = (candidate: T) =>
            (candidate.availabilityStatus || (candidate.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")) === "IN_STOCK" ? 1 : 0;
          return score(right) - score(left) || available(right) - available(left) || (left.sortOrder || 0) - (right.sortOrder || 0);
        })[0];

        return {
          label: value,
          price: variant?.price ?? fallbackPrice,
          offerLabel: variant?.offerLabel,
          image: variant?.image,
          selected: selectedValue.toLocaleLowerCase() === value.toLocaleLowerCase(),
          onSelect: () => variant && onSelect(variant),
        };
      }),
    };
  });
}
