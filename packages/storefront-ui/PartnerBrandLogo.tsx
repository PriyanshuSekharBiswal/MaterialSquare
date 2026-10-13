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
  const [failedUrl, setFailedUrl] = useState("");
  const [wideLogoUrl, setWideLogoUrl] = useState("");
  const [replaceWideRasterWithVector, setReplaceWideRasterWithVector] = useState(false);
  // Partner brand `id` may be a database UUID. Resolve the known catalogue
  // brand from its name before using that id to look up a bundled logo.
  const resolvedBrandId = getBrandMeta(brand.name)?.id || brand.id || brand.name;
  const fallbackLogoUrl = resolveLogoUrl(
    partnerBrandDefaultLogoUrl(resolvedBrandId),
    assetBaseUrl,
  );
  const savedLogoUrl = resolveLogoUrl(brand.logoUrl, assetBaseUrl);
  const logoUrl = savedLogoUrl && failedUrl !== savedLogoUrl
    ? savedLogoUrl
    : fallbackLogoUrl && failedUrl !== fallbackLogoUrl
      ? fallbackLogoUrl
      : "";
  const needsWideLogoCleanup = logoUrl !== "" && wideLogoUrl === logoUrl;
  const defaultLogoFilename = fallbackLogoUrl.split(/[?#]/, 1)[0].split("/").pop();
  const isBundledDefaultLogo = !savedLogoUrl ||
    savedLogoUrl === fallbackLogoUrl ||
    Boolean(defaultLogoFilename && savedLogoUrl.endsWith(`/${defaultLogoFilename}`));

  if (!logoUrl) {
    return <BrandLogo id={resolvedBrandId} className={className} style={style} />;
  }

  if ((needsWideLogoCleanup && isBundledDefaultLogo) || replaceWideRasterWithVector) {
    return <BrandLogo id={resolvedBrandId} className={className} style={style} />;
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
        setReplaceWideRasterWithVector(
          isWide && image.naturalWidth <= 500 && Boolean(getBrandMeta(brand.name)),
        );
      }}
      onError={() => setFailedUrl(logoUrl)}
    />
  );

  return needsWideLogoCleanup
    ? <span className="partner-brand-logo-shell partner-brand-logo-shell--wide">{image}</span>
    : image;
}
