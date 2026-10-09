import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { CatalogueProduct } from "../types";
import ProductRecommendationCard from "./ProductRecommendationCard";

type ProductRecommendationCarouselProps = {
  eyebrow: string;
  title: string;
  browseHref: string;
  browseLabel: string;
  products: CatalogueProduct[];
  description?: string;
  ariaLabel: string;
  showCategory?: boolean;
};

export default function ProductRecommendationCarousel({
  eyebrow,
  title,
  browseHref,
  browseLabel,
  products,
  description,
  ariaLabel,
  showCategory = false,
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
        {products.slice(0, 10).map((product) => <ProductRecommendationCard product={product} showCategory={showCategory} key={product.id} />)}
      </div>
    </>
  );
}
