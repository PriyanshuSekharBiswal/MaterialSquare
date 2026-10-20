import { useState, type CSSProperties } from "react";
import { partnerBrandDefaultLogoUrl } from "@material-square/types";
import { BrandLogo, getBrandMeta } from "./BrandBadges";

type PartnerBrandLike = {
  id?: string;
  name: string;
  logoUrl?: string | null;
};

function resolveLogoUrl(url: string | null | undefined, assetBaseUrl?: string) {
  if (!url || !url.startsWith("/") || !assetBaseUrl) return url || "";
  return `${assetBaseUrl.replace(/\/$/, "")}${url}`;
}

/** The single logo renderer used by both catalogue admin and customer storefront. */
export default function PartnerBrandLogo({
  brand,
  className = "",
  style,
  assetBaseUrl,
}: {
  brand: PartnerBrandLike;
  className?: string;
  style?: CSSProperties;
  assetBaseUrl?: string;
}) {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(() => new Set());
  const [wideLogoUrl, setWideLogoUrl] = useState("");
  const [vectorReplacementUrl, setVectorReplacementUrl] = useState("");
  // Partner brand `id` may be a database UUID. Resolve the known catalogue
  // brand from its name before using that id to look up a bundled logo.
  const knownBrandId = getBrandMeta(brand.name)?.id;
  const resolvedBrandId = knownBrandId || brand.id || brand.name;
  const vectorBrandId = knownBrandId || getBrandMeta(brand.id)?.id || brand.name;
  const fallbackLogoUrl = resolveLogoUrl(
    partnerBrandDefaultLogoUrl(resolvedBrandId),
    assetBaseUrl,
  );
  const savedLogoUrl = resolveLogoUrl(brand.logoUrl, assetBaseUrl);
  const logoUrl = savedLogoUrl && !failedUrls.has(savedLogoUrl)
    ? savedLogoUrl
    : fallbackLogoUrl && !failedUrls.has(fallbackLogoUrl)
      ? fallbackLogoUrl
      : "";
  const needsWideLogoCleanup = logoUrl !== "" && wideLogoUrl === logoUrl;
  const isBundledDefaultLogo = logoUrl === fallbackLogoUrl;

  if (!logoUrl) {
    return <BrandLogo id={vectorBrandId} className={className} style={style} />;
  }

  if ((needsWideLogoCleanup && isBundledDefaultLogo) || vectorReplacementUrl === logoUrl) {
    return <BrandLogo id={vectorBrandId} className={className} style={style} />;
  }

  const image = (
    <img
      src={logoUrl}
      alt={`${brand.name} logo`}
      className={`${className}${needsWideLogoCleanup ? " partner-brand-logo--wide" : ""}`.trim()}
      style={{ objectFit: "contain", ...style }}
      loading="lazy"
      decoding="async"
      onLoad={(event) => {
        const image = event.currentTarget;
        const isWide = image.naturalHeight > 0 && image.naturalWidth / image.naturalHeight >= 3.6;
        setWideLogoUrl(isWide ? logoUrl : "");
        setVectorReplacementUrl(
          isWide && image.naturalWidth <= 500 && isBundledDefaultLogo && getBrandMeta(brand.name) ? logoUrl : "",
        );
      }}
      onError={() => setFailedUrls((previous) => new Set(previous).add(logoUrl))}
    />
  );

  return needsWideLogoCleanup
    ? <span className="partner-brand-logo-shell partner-brand-logo-shell--wide">{image}</span>
    : image;
}
