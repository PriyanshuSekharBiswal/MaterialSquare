import { useState, type CSSProperties } from "react";
import { BrandLogo } from "./icons/BrandBadges";

type PartnerBrandLike = {
  id?: string;
  name: string;
  logoUrl?: string | null;
};

export default function PartnerBrandLogo({
  brand,
  className = "",
  style,
}: {
  brand: PartnerBrandLike;
  className?: string;
  style?: CSSProperties;
}) {
  const [failedUrl, setFailedUrl] = useState("");
  if (!brand.logoUrl || failedUrl === brand.logoUrl) {
    return <BrandLogo id={brand.id || brand.name} className={className} style={style} />;
  }

  return (
    <img
      src={brand.logoUrl}
      alt={`${brand.name} logo`}
      className={className}
      style={{ objectFit: "contain", ...style }}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(brand.logoUrl || "")}
    />
  );
}
