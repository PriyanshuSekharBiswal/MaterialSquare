import { Check, Info, Package, PackagePlus, Plus } from "lucide-react";
import { Link, useInRouterContext } from "react-router-dom";
import type { ReactNode } from "react";
import PartnerBrandLogo from "./PartnerBrandLogo";
import "./marketplace-product-card.css";

export type MarketplaceCardBrand = { id?: string; name: string; logoUrl?: string | null };

export type MarketplaceProductCardProps = {
  name: string;
  brand: MarketplaceCardBrand;
  brandAssetBaseUrl?: string;
  code?: string | null;
  image?: string | null;
  imageContent?: ReactNode;
  categoryLabel?: string;
  bannerLabel?: string;
  bannerKind?: "explicit" | "calculated";
  specification?: string;
  optionLabel?: string;
  sizeGuide?: string;
  colours?: string[];
  features?: string[];
  detailHref: string;
  priceCaption: string;
  priceLabel: string;
  compareAtPriceLabel?: string;
  availability: "IN_STOCK" | "OUT_OF_STOCK" | "CHECK_AVAILABILITY";
  availabilityLabel: string;
  minimumOrderLabel: string;
  chooseOptions: boolean;
  inQuoteList?: boolean;
  whatsappHref?: string;
  preview?: boolean;
  previewViewport?: "desktop" | "mobile";
  className?: string;
  onOpenCard?: () => void;
  onViewDetails?: () => void;
  onChooseOptions?: () => void;
};

function WhatsAppMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.1-.476-.15-.677.15-.2.301-.776.978-.952 1.179-.175.2-.351.226-.652.075-.301-.15-1.272-.469-2.423-1.496-.895-.798-1.5-1.784-1.675-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.501.1-.2.05-.376-.025-.527-.075-.15-.677-1.632-.928-2.234-.244-.587-.492-.507-.677-.516-.175-.009-.376-.01-.577-.01-.2 0-.526.075-.802.376-.276.301-1.053 1.028-1.053 2.508 0 1.48 1.078 2.909 1.229 3.11.15.2 2.122 3.24 5.141 4.544.718.31 1.279.495 1.716.634.721.229 1.377.197 1.896.119.578-.087 1.78-.727 2.031-1.43.251-.703.251-1.305.176-1.43-.075-.126-.276-.201-.577-.352z" />
    <path d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.947.561 3.766 1.531 5.306L2 22l4.825-1.494a9.96 9.96 0 0 0 5.179 1.498c5.524 0 10.004-4.48 10.004-10.004C22.008 6.48 17.528 2 12.004 2zm0 18.008a7.95 7.95 0 0 1-4.053-1.111l-.29-.172-2.868.888.905-2.793-.189-.3a7.96 7.96 0 0 1-1.509-4.516c0-4.414 3.59-8.004 8.004-8.004 4.414 0 8.004 3.59 8.004 8.004 0 4.414-3.59 8.004-8.004 8.004z" />
  </svg>;
}

export default function MarketplaceProductCard({
  name, brand, brandAssetBaseUrl, code, image, imageContent: providedImageContent, categoryLabel, bannerLabel, bannerKind = "explicit",
  specification, optionLabel, sizeGuide, colours = [], detailHref, priceCaption,
  priceLabel, compareAtPriceLabel, availability, availabilityLabel, minimumOrderLabel,
  features = [], chooseOptions, inQuoteList = false, whatsappHref, preview = false, previewViewport = "desktop", className = "",
  onViewDetails, onChooseOptions, onOpenCard,
}: MarketplaceProductCardProps) {
  const inRouter = useInRouterContext();
  const title = name || "Product name";
  const imageContent = providedImageContent ?? (image
    ? <img src={image} alt={title} loading="lazy" decoding="async" />
    : <div className="product-image-placeholder" role="img" aria-label={`${title} image not provided`}><PackagePlus aria-hidden="true" /><span>Product image preview</span></div>);
  const media = <>
    {imageContent}
    <div className="media-overlay-tags">{categoryLabel && <span className="product-cat-tag">{categoryLabel}</span>}</div>
    {bannerLabel && <span className={`catalog-card-offer${bannerKind === "explicit" ? " is-explicit-offer" : " is-calculated-offer"}`}>{bannerLabel}</span>}
  </>;
  const textLink = preview || !inRouter
    ? <span>{title}</span>
    : <Link to={detailHref}>{title}</Link>;

  return <article className={`catalog-product-card shared-marketplace-card${preview && previewViewport === "mobile" ? " is-mobile-preview" : ""} ${className}`.trim()} tabIndex={onOpenCard ? 0 : undefined}
    aria-label={onOpenCard ? `Open ${title}${optionLabel ? `, ${optionLabel}` : ""}` : undefined}
    onClick={(event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('a, button, input, select, textarea, [role="button"]')) return;
      onOpenCard?.();
    }}
    onKeyDown={(event) => {
      if (!onOpenCard || event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      onOpenCard();
    }}>
    {preview || !inRouter
      ? <div className="product-media-box" aria-hidden={preview || !inRouter}>{media}</div>
      : <Link className="product-media-box" to={detailHref} aria-label={`View ${title}`}>{media}</Link>}
    <div className="product-card-body">
      <div className="brand-code-line">
        <div className="brand-title-badge">
          <span className="brand-mini-logo-frame" aria-hidden="true">
            <PartnerBrandLogo brand={brand} assetBaseUrl={brandAssetBaseUrl} className="marketplace-brand-logo" />
          </span>
          <span className="brand-title">{brand.name}</span>
        </div>
        {code && <span className="product-sku-code" title={code}>{code}</span>}
      </div>
      <h3 className="product-card-title">{textLink}</h3>
      {specification && <div className="grade-badge-chip" aria-label={`Specification ${specification}`}><span>{specification}</span></div>}
      {optionLabel && <div className="catalogue-marketplace-option" aria-label={`Option ${optionLabel}`}><span>Option</span><strong>{optionLabel}</strong></div>}
      {sizeGuide && <p className="product-size-guide">Size guide: {sizeGuide}. Specify your requirement in product details.</p>}
      {colours.length > 0 && <div className="catalog-colour-preview" aria-label={`Available colours and finishes: ${colours.join(", ")}`}>
        <span>Colours &amp; finishes</span>
        <div className="catalog-colour-values">{colours.slice(0, 3).map((colour) => <small key={colour}>{colour}</small>)}{colours.length > 3 && <small>+{colours.length - 3}</small>}</div>
      </div>}
      {features.length > 0 && <ul className="product-features-preview">{features.slice(0, 2).map((feature, index) => <li key={`${feature}-${index}`}><Check size={13} className="check-icon-green" /><span>{feature}</span></li>)}</ul>}
      <div className="marketplace-card-footer">
        <div className="pricing-row">
          <div className="marketplace-card-price">
            <span className="rate-caption">{priceCaption}</span>
            <span className="rate-amount">{priceLabel}</span>
            {compareAtPriceLabel && <del className="catalogue-card-compare-price">{compareAtPriceLabel}</del>}
          </div>
          <div className="marketplace-card-pricing-meta">
            <span className={`catalogue-stock-pill status-${availability.toLocaleLowerCase().replaceAll("_", "-")}`}>{availabilityLabel}</span>
            <span className="min-order-pill"><Package size={12} /><span>{minimumOrderLabel}</span></span>
          </div>
        </div>
        <div className="product-actions-grid">
          {preview && onViewDetails ? <button type="button" className="btn-card-specs" onClick={onViewDetails}><Info size={14} /> View details</button>
            : preview ? <span className="btn-card-specs" aria-hidden="true"><Info size={14} /> View details</span>
            : <button type="button" className="btn-card-specs" onClick={onViewDetails}><Info size={14} /> View details</button>}
          {preview && onChooseOptions ? <button type="button" className={`btn-card-bom${inQuoteList ? " in-bom" : ""}`} onClick={onChooseOptions}><Plus size={14} /> {chooseOptions ? "Choose options" : inQuoteList ? "View quote list" : "Add to quote list"}</button>
            : preview ? <span className={`btn-card-bom${inQuoteList ? " in-bom" : ""}`} aria-hidden="true"><Plus size={14} /> {chooseOptions ? "Choose options" : inQuoteList ? "View quote list" : "Add to quote list"}</span>
            : <button type="button" className={`btn-card-bom${inQuoteList ? " in-bom" : ""}`} onClick={onChooseOptions}>{inQuoteList ? <Check size={14} /> : <Plus size={14} />}{" "}{chooseOptions ? "Choose options" : inQuoteList ? "View quote list" : "Add to quote list"}</button>}
          {whatsappHref && (preview || inRouter
            ? <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-card-whatsapp" title="Ask about this product on WhatsApp" aria-label="Ask about this product on WhatsApp"><WhatsAppMark /></a>
            : <span className="btn-card-whatsapp" aria-hidden="true"><WhatsAppMark /></span>)}
        </div>
      </div>
    </div>
  </article>;
}
