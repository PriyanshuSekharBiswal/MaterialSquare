export type StorefrontCategory = {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  image: string;
};

export type ManagedCatalogueCategory = {
  id: string;
  label: string;
  active: boolean;
  aliases: string[];
};

/** Stable storefront categories. Keep these visible even while their listings are empty. */
export const STOREFRONT_CATEGORIES: StorefrontCategory[] = [
  {
    id: "cement",
    label: "Cement & Aggregates",
    subtitle: "UltraTech, Ambuja, JK Cement, Shree",
    badge: "Cement & Aggregates",
    image: "/images/categories/cement-category.webp",
  },
  {
    id: "pipes",
    label: "Pipes & Fittings",
    subtitle: "Astral CPVC, Supreme SWR, Finolex, Zoloto",
    badge: "Pipes & Fittings",
    image: "/images/categories/pipes-category.webp",
  },
  {
    id: "wires",
    label: "Wires & Electrical",
    subtitle: "Polycab FR-LSH, Havells, Finolex Cables",
    badge: "Wires & Electrical",
    image: "/images/categories/wires-category.webp",
  },
  {
    id: "paints",
    label: "Paints & Wall Finishes",
    subtitle: "Asian Paints Apex, Birla Opus, Wall Putty",
    badge: "Paints & Wall Finishes",
    image: "/images/categories/paints-category.webp",
  },
  {
    id: "sanitary",
    label: "Sanitaryware & Bath",
    subtitle: "Jaquar, CERA, bath fittings and sinks",
    badge: "Sanitaryware & Bath",
    image: "/images/categories/sanitary-category.webp",
  },
  {
    id: "steel",
    label: "Steel & Reinforcement",
    subtitle: "Tata Tiscon and reinforcement materials",
    badge: "Steel & Reinforcement",
    image: "/images/categories/steel-category.webp",
  },
  {
    id: "adhesives",
    label: "Adhesives & Grouts",
    subtitle: "MYK Laticrete and tile installation materials",
    badge: "Adhesives & Grouts",
    image: "/images/categories/adhesives-category.webp",
  },
];

/** Maps common catalogue labels and keys onto the stable storefront category. */
export function normalizeCatalogueCategory(value: string): string {
  const key = value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (/cement|aggregate/.test(key)) return "cement";
  if (/pipe|plumb|valve|fitting/.test(key)) return "pipes";
  if (/wire|cable|electrical/.test(key)) return "wires";
  if (/paint|wall prep|wall finish|waterproof|putty|coating/.test(key)) return "paints";
  if (/sanitary|bath|faucet|sink/.test(key)) return "sanitary";
  if (/steel|rebar|reinforcement|tmt/.test(key)) return "steel";
  if (/adhesive|grout|laticrete/.test(key)) return "adhesives";
  return key.replace(/\s+/g, "-");
}

/** Merge saved category settings with category labels used by partner brands. */
export function buildCatalogueCategoryDirectory(
  settings: readonly ManagedCatalogueCategory[] = [],
  brandLabels: readonly string[] = [],
): ManagedCatalogueCategory[] {
  const categories = new Map<string, ManagedCatalogueCategory>(
    STOREFRONT_CATEGORIES.map(({ id, label }) => [id, { id, label, active: true, aliases: [] }]),
  );
  const findId = (value: string) => {
    const normalized = normalizeCatalogueCategory(value);
    for (const category of categories.values()) {
      if (category.id === normalized || normalizeCatalogueCategory(category.label) === normalized || category.aliases.some((alias) => normalizeCatalogueCategory(alias) === normalized)) return category.id;
    }
    return normalized;
  };

  for (const setting of settings) {
    const id = setting.id.trim() || findId(setting.label);
    const existing = categories.get(id);
    categories.set(id, {
      id,
      label: setting.label.trim() || existing?.label || id,
      active: setting.active !== false,
      aliases: [...new Set([...(existing?.aliases || []), ...(setting.aliases || []), ...(existing && existing.label !== setting.label ? [existing.label] : [])].map((alias) => alias.trim()).filter(Boolean))],
    });
  }

  for (const rawLabel of brandLabels) {
    const label = rawLabel.trim();
    if (!label) continue;
    const id = findId(label);
    const existing = categories.get(id);
    if (existing) {
      if (!existing.aliases.some((alias) => normalizeCatalogueCategory(alias) === normalizeCatalogueCategory(label)) && normalizeCatalogueCategory(existing.label) !== normalizeCatalogueCategory(label)) {
        categories.set(id, { ...existing, aliases: [...existing.aliases, label] });
      }
    } else {
      categories.set(id, { id, label, active: true, aliases: [] });
    }
  }

  return [...categories.values()];
}

export function resolveCatalogueCategoryId(value: string, categories: readonly ManagedCatalogueCategory[]): string {
  const normalized = normalizeCatalogueCategory(value);
  return categories.find((category) => category.id === normalized ||
    normalizeCatalogueCategory(category.label) === normalized ||
    category.aliases.some((alias) => normalizeCatalogueCategory(alias) === normalized))?.id || normalized;
}
