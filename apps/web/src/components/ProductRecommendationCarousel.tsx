import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { CatalogueProduct, CatalogueVariant } from "../types";
import type { PartnerBrand } from "../partner-brands";
import ProductRecommendationCard from "./ProductRecommendationCard";

type ProductRecommendationCarouselProps = {
  eyebrow: string;
  title: string;
  browseHref: string;
  browseLabel: string;
  products: CatalogueProduct[];
  variantProduct?: CatalogueProduct;
  variants?: CatalogueVariant[];
  description?: string;
  ariaLabel: string;
  showCategory?: boolean;
  partnerBrands?: PartnerBrand[];
};

export default function ProductRecommendationCarousel({
  eyebrow,
  title,
  browseHref,
  browseLabel,
  products,
  variantProduct,
  variants = [],
  description,
  ariaLabel,
  showCategory = false,
  partnerBrands = [],
}: ProductRecommendationCarouselProps) {
  return (
    <>
      <div className="product-related-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <Link className="product-related-browse" to={browseHref}>{browseLabel}<ArrowRight size={14} /></Link>
      </div>
      {description && <p className="project-related-note">{description}</p>}
      <div className="product-related-slider" aria-label={ariaLabel} tabIndex={0}>
        {variantProduct && variants.map((variant) => (
          <ProductRecommendationCard
            product={variantProduct}
            variant={variant}
            partnerBrands={partnerBrands}
            showCategory={showCategory}
            key={`${variantProduct.id}-${variant.id}`}
          />
        ))}
        {products.slice(0, 10).map((product) => <ProductRecommendationCard product={product} partnerBrands={partnerBrands} showCategory={showCategory} key={product.id} />)}
      </div>
    </>
  );
}
