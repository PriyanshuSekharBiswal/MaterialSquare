import React from "react";
import { Check, Plus, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { materialId } from "../ids";
import { useCustomer } from "../customer";
import { trackWebsiteEvent } from "../analytics";
import type { CatalogueProduct, CatalogueVariant, MaterialItem } from "../types";
import ProductImage from "./ProductImage";
import { BrandLogo, getBrandMeta } from "./icons/BrandBadges";

function formatPrice(value: number | string) {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function variantSpecification(variant: CatalogueVariant) {
  return [variant.label, ...Object.entries(variant.attributes || {}).map(([key, value]) => `${key}: ${value}`)]
    .filter(Boolean)
    .join(" · ");
}

export default function ProductRecommendationCard({ product, showCategory = false }: { product: CatalogueProduct; showCategory?: boolean }) {
  const { items, updateItems, ready } = useCustomer();
  const href = `/product/${encodeURIComponent(product.id)}`;
  const variants = product.variants || [];
  const needsOptions = variants.length > 1 || Boolean(product.specs?.sizes);
  const existingItems = items.filter((item) => (item.catalogueId || item.id) === product.id);
  const existingItem = existingItems[0];
  const addableVariant = variants.length === 1 ? variants[0] : undefined;
  const pricedVariants = variants.filter((variant) => variant.price != null);
  const lowestVariantPrice = pricedVariants.length
    ? Math.min(...pricedVariants.map((variant) => Number(variant.price)))
    : null;
  const price = product.price != null ? formatPrice(product.price)
    : lowestVariantPrice != null ? `From ${formatPrice(lowestVariantPrice)}`
    : "Request a quote";
  const unit = addableVariant?.unit || product.unit;
  const brandMeta = getBrandMeta(product.brand);

  function addToList() {
    if (!ready || needsOptions || existingItem) return;
    const minimum = Number(addableVariant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 1) || 1;
    const specification = addableVariant ? variantSpecification(addableVariant) : "";
    const item: MaterialItem = {
      ...product,
      ...(addableVariant ? {
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
      <Link className="product-related-media" to={href} aria-label={`View ${product.name}`}>
        <ProductImage src={addableVariant?.image || product.image} alt={product.name} />
      </Link>
      <div className="product-related-content">
        {showCategory && <span className="product-related-category">{product.categoryLabel}</span>}
        <Link className="product-related-brand" to={`/marketplace?brand=${encodeURIComponent(product.brand)}`}>
          <span className="product-related-brand-logo">
            <BrandLogo id={brandMeta?.id || product.brand} className="brand-logo-mini" />
          </span>
          <span className="product-related-brand-name">{product.brand}</span>
        </Link>
        <Link className="product-related-name" to={href}>{product.name}</Link>
        <div className="product-related-footer">
          <div className="product-related-price" aria-label={product.price != null || lowestVariantPrice != null ? `${price} per ${unit}` : price}>
            <strong>{price}</strong>
            {(product.price != null || lowestVariantPrice != null) && <small>/{unit}</small>}
          </div>
          {existingItem ? (
            <Link className="product-related-action is-added" to="/material-list" aria-label={`${product.name} is in your quote list`}><Check size={14} /><span>Added</span></Link>
          ) : needsOptions ? (
            <Link className="product-related-action" to={href} aria-label={`Choose options for ${product.name}`}><SlidersHorizontal size={14} /><span>Options</span></Link>
          ) : (
            <button className="product-related-action" type="button" onClick={addToList} disabled={!ready} aria-label={`Add ${product.name} to quote list`}><Plus size={15} /><span>Add</span></button>
          )}
        </div>
      </div>
    </article>
  );
}
