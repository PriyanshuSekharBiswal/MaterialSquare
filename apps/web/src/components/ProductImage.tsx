import { Package } from "lucide-react";
import React from "react";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/** Renders only a client-supplied catalogue image, with a neutral fallback. */
export default function ProductImage({
  src,
  alt,
  className = "",
  loading = "lazy",
}: ProductImageProps) {
  if (!src) {
    return (
      <div
        className={`product-image-placeholder ${className}`}
        role="img"
        aria-label={`${alt} image not provided`}
      >
        <Package aria-hidden="true" />
      </div>
    );
  }

  return <img className={className} src={src} alt={alt} loading={loading} decoding="async" />;
}
