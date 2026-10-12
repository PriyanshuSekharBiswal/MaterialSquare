import { PackagePlus } from "lucide-react";
import React, { useState } from "react";

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
  const optimizedSrc = src ? webpLocalImageSource(src) : "";
  const [failedOptimizedSrc, setFailedOptimizedSrc] = useState<string | null>(null);
  if (!src) {
    return (
      <div
        className={`product-image-placeholder ${className}`}
        role="img"
        aria-label={`${alt} image not provided`}
      >
        <PackagePlus aria-hidden="true" />
        <span>Product image preview</span>
      </div>
    );
  }

  const imageSrc = failedOptimizedSrc === optimizedSrc ? src : optimizedSrc;
  return (
    <img
      className={className}
      src={imageSrc}
      alt={alt}
      loading={loading}
      fetchPriority={loading === "eager" ? "high" : "auto"}
      decoding="async"
      onError={() => {
        if (imageSrc === optimizedSrc && optimizedSrc !== src)
          setFailedOptimizedSrc(optimizedSrc);
      }}
    />
  );
}

function webpLocalImageSource(src: string) {
  try {
    const url = new URL(src, window.location.origin);
    const isOptimizedAsset =
      url.pathname.startsWith("/images/products/") ||
      url.pathname === "/images/materials-editorial.png";
    if (
      url.origin !== window.location.origin ||
      !isOptimizedAsset ||
      !url.pathname.toLowerCase().endsWith(".png")
    )
      return src;
    url.pathname = url.pathname.replace(/\.png$/i, ".webp");
    return src.startsWith("/")
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return src;
  }
}
