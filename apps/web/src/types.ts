export interface CatalogueProduct {
  id: string;
  code: string;
  name: string;
  brand: string;
  brandTagline?: string;
  category: string;
  categoryLabel: string;
  unit: string;
  packaging?: string;
  image: string;
  grade?: string;
  features: string[];
  applications: string[];
  minOrderQty?: string;
  inStock: boolean;
  dispatchTime?: string;
  wholesaleRate?: string;
  specs?: Record<string, string | undefined>;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  priceNote?: string | null;
  offerLabel?: string | null;
  offerStartsAt?: string | null;
  offerEndsAt?: string | null;
  description?: string | null;
}
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
