import { useEffect, useState } from "react";
import { BRAND_LIST, getBrandMeta } from "./components/icons/BrandBadges";

export type PartnerBrand = {
  id: string;
  name: string;
  category: string;
  tagline: string;
  isActive: boolean;
  sortOrder: number;
};

const defaults: PartnerBrand[] = BRAND_LIST.map((brand, sortOrder) => ({
  id: brand.id,
  name: brand.name,
  category: brand.category,
  tagline: brand.tagline,
  isActive: true,
  sortOrder,
}));

export function usePartnerBrands() {
  const [brands, setBrands] = useState(defaults);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/products/partner-brands`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then((response) => response.ok ? response.json() as Promise<PartnerBrand[]> : null)
      .then((value) => {
        if (value && !controller.signal.aborted) {
          setBrands(value.filter((brand) => brand.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  return brands;
}

export function partnerBrandMatchesProduct(brandName: string, productBrand: string, category = "") {
  const categoryKey = category.toLocaleLowerCase();
  const resolve = (name: string) => {
    if (name.toLocaleLowerCase().includes("finolex")) {
      const nameKey = name.toLocaleLowerCase();
      if (/wire|cable/.test(nameKey)) return "finolex-cables";
      if (/pipe|plumb/.test(nameKey)) return "finolex-pipes";
      if (/wire|cable/.test(categoryKey)) return "finolex-cables";
      if (/pipe|plumb/.test(categoryKey)) return "finolex-pipes";
    }
    return getBrandMeta(name)?.id || name.trim().toLocaleLowerCase();
  };
  return resolve(brandName) === resolve(productBrand);
}
