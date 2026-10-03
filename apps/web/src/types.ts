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
  galleryImages?: string[];
  variants?: CatalogueVariant[];
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
export interface CatalogueVariant {
  id: string;
  code?: string | null;
  label: string;
  attributes: Record<string, string>;
  unit: string;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  priceNote?: string | null;
  offerLabel?: string | null;
  inStock: boolean;
  stockQuantity?: number | string | null;
  minOrderQuantity?: number | string | null;
  sortOrder: number;
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
    variantId?: string;
    price?: number | string | null;
    compareAtPrice?: number | string | null;
    priceNote?: string | null;
    specs?: Record<string, string | undefined>;
  };
