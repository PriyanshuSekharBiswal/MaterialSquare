import type { PRODUCTS } from "./data/materialsData";
export type CatalogueProduct = (typeof PRODUCTS)[number];
export type MaterialItem = Pick<
  CatalogueProduct,
  "id" | "name" | "brand" | "unit"
> &
  Partial<
    Pick<CatalogueProduct, "code" | "category" | "wholesaleRate" | "inStock">
  > & {
    catalogueId?: string;
    quantity?: number;
    specification?: string;
    specs?: Record<string, string | undefined>;
  };
