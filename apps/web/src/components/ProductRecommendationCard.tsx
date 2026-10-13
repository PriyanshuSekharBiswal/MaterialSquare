import React from "react";
import { Check, Plus, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { materialId } from "../ids";
import { useCustomer } from "../customer";
import { trackWebsiteEvent } from "../analytics";
import type { CatalogueProduct, CatalogueVariant, MaterialItem } from "../types";
import ProductImage from "./ProductImage";
import PartnerBrandLogo from "./PartnerBrandLogo";
import { partnerBrandMatchesProduct, type PartnerBrand } from "../partner-brands";

function formatPrice(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function variantSpecification(variant: CatalogueVariant) {
  return [variant.label, ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`)]
    .filter(Boolean)
    .join(" · ");
}

export default function ProductRecommendationCard({ product, variant, showCategory = false, partnerBrands = [] }: { product: CatalogueProduct; variant?: CatalogueVariant; showCategory?: boolean; partnerBrands?: PartnerBrand[] }) {
  const { items, updateItems, ready } = useCustomer();
  const productHref = `/product/${encodeURIComponent(product.id)}${variant ? `?variant=${encodeURIComponent(variant.id)}` : ""}`;
  const variants = product.variants || [];
  const needsOptions = !variant && (variants.length > 1 || Boolean(product.specs?.sizes));
  const existingItems = items.filter((item) => (item.catalogueId || item.id) === product.id);
  const existingItem = variant
    ? existingItems.find((item) => item.variantId === variant.id)
    : existingItems[0];
  const destination = existingItem
    ? `/material-list?item=${encodeURIComponent(existingItem.id)}`
    : productHref;
  const addableVariant = variant || (variants.length === 1 ? variants[0] : undefined);
  const pricedVariants = variants.filter((variant) => variant.price != null);
  const lowestVariantPrice = pricedVariants.length
    ? Math.min(...pricedVariants.map((variant) => Number(variant.price)))
    : null;
  const price = variant?.price != null ? formatPrice(variant.price)
    : product.price != null ? formatPrice(product.price)
    : lowestVariantPrice != null ? `From ${formatPrice(lowestVariantPrice)}`
    : "Request a quote";
  const unit = addableVariant?.unit || product.unit;
  const partnerBrand = partnerBrands.find((brand) => partnerBrandMatchesProduct(brand.name, product.brand, `${product.category} ${product.categoryLabel}`));
  const displayBrandName = partnerBrand?.name || product.brand;

  function addToList() {
    if (!ready || needsOptions || existingItem) return;
    const minimum = Number(addableVariant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 1) || 1;
    const specification = addableVariant ? variantSpecification(addableVariant) : "";
    const item: MaterialItem = {
      ...product,
      ...(addableVariant ? {
        code: addableVariant.code || product.code,
        price: addableVariant.price ?? product.price,
        compareAtPrice: addableVariant.compareAtPrice ?? product.compareAtPrice,
        priceNote: addableVariant.priceNote || product.priceNote,
        variantId: addableVariant.id,
        minOrderQuantity: addableVariant.minOrderQuantity,
        inStock: addableVariant.inStock,
        image: addableVariant.image || product.image,
        galleryImages: addableVariant.galleryImages || product.galleryImages,
      } : {}),
      catalogueId: product.id,
      id: `${product.id}-${materialId()}`,
      quantity: minimum,
      specification,
    };
    const accepted = updateItems((previous) => [...previous, item]);
    if (accepted) trackWebsiteEvent({ type: "add_to_list", target: product.id });
  }

  return (
    <article className="product-related-card">
      <Link className="product-related-media" to={destination} aria-label={existingItem ? `${product.name}${variant ? `, ${variant.label}` : ""} is in your cart. Go to this item` : `View ${product.name}${variant ? `, ${variant.label}` : ""}`}>
        <ProductImage src={variant?.image || addableVariant?.image || product.image} alt={product.name} />
      </Link>
      <div className="product-related-content">
        {showCategory && <span className="product-related-category">{product.categoryLabel}</span>}
        <Link className="product-related-brand" to={`/marketplace?brand=${encodeURIComponent(displayBrandName)}`}>
          <span className="product-related-brand-logo">
            <PartnerBrandLogo brand={partnerBrand || { name: product.brand }} className="brand-logo-mini" />
          </span>
          <span className="product-related-brand-name">{displayBrandName}</span>
        </Link>
        <Link className="product-related-name" to={destination}>{variant ? variant.label : product.name}</Link>
        <div className="product-related-footer">
          <div className="product-related-price" aria-label={product.price != null || lowestVariantPrice != null ? `${price} per ${unit}` : price}>
            <strong>{price}</strong>
            {(product.price != null || lowestVariantPrice != null) && <small>/{unit}</small>}
          </div>
          {existingItem ? (
            <Link className="product-related-action is-added" to={destination} aria-label={`${product.name} is in your cart. Go to this item`}><Check size={14} /><span>Added</span></Link>
          ) : variant ? (
            <Link className="product-related-action" to={productHref} aria-label={`Choose ${variant.label} for ${product.name}`}><SlidersHorizontal size={14} /><span>Choose</span></Link>
          ) : needsOptions ? (
            <Link className="product-related-action" to={productHref} aria-label={`Choose options for ${product.name}`}><SlidersHorizontal size={14} /><span>Options</span></Link>
          ) : (
            <button className="product-related-action" type="button" onClick={addToList} disabled={!ready} aria-label={`Add ${product.name} to quote list`}><Plus size={15} /><span>Add</span></button>
          )}
        </div>
      </div>
    </article>
  );
}
