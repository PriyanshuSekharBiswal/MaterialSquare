import { useEffect, useState } from "react";
import { STOREFRONT_CATEGORIES, type ManagedCatalogueCategory, type StorefrontCategory } from "@material-square/types";

export type StorefrontCategoryOption = StorefrontCategory & Pick<ManagedCatalogueCategory, "active" | "aliases">;

function toStorefrontCategory(category: ManagedCatalogueCategory): StorefrontCategoryOption {
  const base = STOREFRONT_CATEGORIES.find((item) => item.id === category.id);
  return {
    id: category.id,
    label: category.label,
    badge: category.label,
    subtitle: base?.subtitle || `Browse ${category.label.toLowerCase()} materials from participating brands.`,
    image: base?.image || "",
    active: category.active,
    aliases: category.aliases || [],
  };
}

export function useCatalogueCategories() {
  const [categories, setCategories] = useState<StorefrontCategoryOption[]>(() =>
    STOREFRONT_CATEGORIES.map((category) => toStorefrontCategory({ ...category, active: true, aliases: [] })),
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/products/categories`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok ? response.json() as Promise<ManagedCatalogueCategory[]> : null)
      .then((result) => {
        if (!result || controller.signal.aborted) return;
        setCategories(result.filter((item) => item && item.active !== false && typeof item.id === "string" && typeof item.label === "string").map(toStorefrontCategory));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return categories;
}
