import type { FormEvent, ReactNode } from "react";
import { ArrowRight, ChevronDown, PackagePlus } from "lucide-react";
import { Link, useInRouterContext } from "react-router-dom";
import type { FaqEntry, WebsitePolicy } from "@material-square/types";
import "./product-detail-surface.css";

export interface ProductDetailChoice {
  label: string;
  price?: number | string | null;
  offerLabel?: string | null;
  image?: string | null;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface ProductDetailChoiceGroup {
  label: string;
  presentation?: "cards" | "select";
  selectedValue?: string;
  choices: ProductDetailChoice[];
}

export interface ProductDetailSurfaceProps {
  title: string;
  brand: string;
  brandMark?: ReactNode;
  brandTagline?: string;
  category: string;
  code?: string | null;
  grade?: string | null;
  photoBanner?: string | null;
  images: string[];
  selectedImage?: string | null;
  onImageSelect?: (image: string) => void;
  price?: number | string | null;
  compareAtPrice?: number | string | null;
  unit?: string;
  priceCaption?: string;
  offerLabel?: string | null;
  priceNote?: string | null;
  availability?: string;
  stockQuantity?: number | string | null;
  minimumOrder?: number | string | null;
  choiceGroups?: ProductDetailChoiceGroup[];
  selectionLabel?: string;
  quantity?: string;
  onQuantityChange?: (value: string) => void;
  specification?: string;
  specificationRequired?: boolean;
  onSpecificationChange?: (value: string) => void;
  description?: string | null;
  faqEntries?: FaqEntry[];
  returnPolicy?: WebsitePolicy | null;
  highlights?: Array<[string, string]>;
  features?: string[];
  applications?: string[];
  quantityBreaks?: Array<{ minimumQuantity: number; unitPrice: number }>;
  actionLabel?: string;
  actionDisabled?: boolean;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  afterAction?: ReactNode;
  preview?: boolean;
}

const formatPrice = (value: number | string) =>
  `₹${Number(value).toLocaleString("en-IN")}`;

function SurfaceLink({
  to,
  preview,
  children,
}: {
  to: string;
  preview: boolean;
  children: ReactNode;
}) {
  const inRouter = useInRouterContext();
  if (!inRouter && preview) return <span>{children}</span>;
  return inRouter ? <Link to={to}>{children}</Link> : <a href={to}>{children}</a>;
}

export default function ProductDetailSurface({
  title,
  brand,
  brandMark,
  brandTagline,
  category,
  code,
  grade,
  photoBanner,
  images,
  selectedImage,
  onImageSelect,
  price,
  compareAtPrice,
  unit = "unit",
  priceCaption,
  offerLabel,
  priceNote,
  availability = "CHECK_AVAILABILITY",
  stockQuantity,
  minimumOrder,
  choiceGroups = [],
  selectionLabel,
  quantity = "1",
  onQuantityChange,
  specification = "",
  specificationRequired = false,
  onSpecificationChange,
  description,
  faqEntries = [],
  returnPolicy,
  highlights = [],
  features = [],
  applications = [],
  quantityBreaks = [],
  actionLabel = "Add to cart",
  actionDisabled = false,
  onSubmit,
  afterAction,
  preview = false,
}: ProductDetailSurfaceProps) {
  const activeImage = selectedImage || images[0] || "";
  const showPhotoBanner = Boolean(
    photoBanner?.trim() &&
    photoBanner.trim().toLocaleLowerCase() !== offerLabel?.trim().toLocaleLowerCase(),
  );
  const unitGroupPattern = /size|unit|pack|volume|capacity|weight/i;
  const preferredChoiceGroup = choiceGroups.find((group) =>
    unitGroupPattern.test(group.label),
  );
  const primaryChoiceGroup = preferredChoiceGroup || choiceGroups[0];
  const displayedChoiceGroups = primaryChoiceGroup
    ? [
        primaryChoiceGroup,
        ...choiceGroups.filter((group) => group !== primaryChoiceGroup),
      ].map((group) => ({
        ...group,
        label:
          group.presentation || !/^(size|unit|pack|volume|capacity|weight)s?$/i.test(group.label)
            ? group.label
            : "Unit",
        presentation:
          group.presentation ||
          (group === primaryChoiceGroup ? "cards" : "select"),
      }))
    : choiceGroups;
  const availabilityText =
    availability === "IN_STOCK"
      ? stockQuantity != null
        ? `In stock · ${stockQuantity} available`
        : "In stock"
      : availability === "OUT_OF_STOCK"
        ? "Out of stock"
        : "Check availability";
  const buyBoxContent = (
    <>
      <div className="shared-product-buy-heading">
        <span>Configure your selection</span>
        <strong>
          {selectionLabel ||
            choiceGroups.find((group) => group.selectedValue)?.selectedValue ||
            "Choose a product option"}
        </strong>
      </div>
      <div className="shared-product-offer-row">
        <div>
          <span className="shared-product-price-caption">
            {priceCaption || (price != null ? `Price per ${unit}` : "Pricing")}
          </span>
          <strong className="shared-product-price">
            {price != null ? formatPrice(price) : "Request a quotation"}
            {price != null &&
              compareAtPrice != null &&
              Number(compareAtPrice) > Number(price) && (
                <del>{formatPrice(compareAtPrice)}</del>
              )}
          </strong>
          {offerLabel && (
            <span className="shared-product-offer-badge">{offerLabel}</span>
          )}
          {priceNote && (
            <small className="shared-product-price-note">{priceNote}</small>
          )}
        </div>
        <span
          className={`shared-product-stock status-${availability.toLowerCase().replaceAll("_", "-")}`}
        >
          {availabilityText}
        </span>
      </div>
      {minimumOrder != null && Number(minimumOrder) > 0 && (
        <p className="shared-product-moq">
          Minimum order: {Number(minimumOrder).toLocaleString("en-IN", { maximumFractionDigits: 3 })}
        </p>
      )}

      {displayedChoiceGroups.map((group) => (
        <fieldset
          className={`shared-product-choice-group ${group.presentation === "select" ? "is-select-group" : "is-card-group"}`}
          key={group.label}
        >
          {group.presentation === "select" ? (
            <div className="shared-product-choice-select">
              <span>{group.label}</span>
              <details className="shared-product-choice-dropdown">
                  <summary aria-label={`Choose ${group.label}`}>
                    <span>{group.selectedValue || "Choose an option"}</span>
                    <ChevronDown aria-hidden="true" size={18} />
                  </summary>
                  <div className="shared-product-choice-menu" role="listbox" aria-label={group.label}>
                    {group.choices.map((choice) => (
                      <button
                        type="button"
                        className="shared-product-choice-option"
                        role="option"
                        aria-selected={choice.label === group.selectedValue}
                        aria-disabled={choice.disabled || undefined}
                        disabled={choice.disabled}
                        key={choice.label}
                        onClick={(event) => {
                          choice.onSelect?.();
                          const dropdown = event.currentTarget.closest("details");
                          if (dropdown) dropdown.open = false;
                        }}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                </details>
            </div>
          ) : (
            <>
              <legend>
                {group.label}
                {group.selectedValue ? (
                  <strong>: {group.selectedValue}</strong>
                ) : null}
              </legend>
              <div className="shared-product-choice-values">
                {group.choices.map((choice) => (
                  <button
                    type="button"
                    key={choice.label}
                    aria-pressed={choice.selected}
                    disabled={choice.disabled}
                    className={`shared-product-choice${choice.selected ? " is-selected" : ""}`}
                    onClick={choice.onSelect}
                  >
                    <span>
                      <span className="shared-product-choice-name">
                        {choice.label}
                      </span>
                      <strong>
                        {choice.price != null
                          ? formatPrice(choice.price)
                          : "Request a quotation"}
                      </strong>
                      {choice.offerLabel && <small>{choice.offerLabel}</small>}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </fieldset>
      ))}
      {!choiceGroups.length && onSpecificationChange && (
        <label className="shared-product-specification">
          Required size / specification
          {specificationRequired ? " *" : " (optional)"}
          <input
            required={specificationRequired}
            maxLength={500}
            value={specification}
            placeholder="Enter your required size or variant"
            onChange={(event) => onSpecificationChange(event.target.value)}
          />
        </label>
      )}
      {(preview || onQuantityChange) && (
        <div className="shared-product-quantity-row">
          <label>
            <span>Quantity</span>
            <input
              type="number"
              min={
                minimumOrder && Number(minimumOrder) > 0 ? minimumOrder : 1
              }
              max="1000000"
              step="any"
              required
              value={quantity}
              readOnly={!onQuantityChange}
              onChange={(event) => onQuantityChange?.(event.target.value)}
            />
          </label>
          <button
            type={preview ? "button" : "submit"}
            aria-disabled={preview || actionDisabled || undefined}
            tabIndex={preview ? -1 : undefined}
            disabled={actionDisabled}
            className="shared-product-action"
          >
            <PackagePlus size={16} />
            {actionLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      <p className="shared-product-shipping-note">
        Incl. GST. <SurfaceLink to="/shipping" preview={preview}>Shipping</SurfaceLink> charges are confirmed on your quotation or order.
      </p>

      <div className="shared-product-accordions">
          <details className="shared-product-accordion">
              <summary>Product Highlights</summary>
              <div className="shared-product-accordion-content">
                {highlights.length > 0 && (
                  <dl>
                    {highlights.map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {features.length > 0 && (
                  <section>
                    <h3>Key features</h3>
                    <ul>
                      {features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {applications.length > 0 && (
                  <section>
                    <h3>Applications</h3>
                    <ul>
                      {applications.map((application) => (
                        <li key={application}>{application}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {quantityBreaks.length > 0 && (
                  <section>
                    <h3>Quantity prices</h3>
                    {quantityBreaks.map((row) => (
                      <div
                        className="shared-product-break"
                        key={`${row.minimumQuantity}-${row.unitPrice}`}
                      >
                        <span>
                          {Number(row.minimumQuantity).toLocaleString("en-IN")}+{" "}
                          {unit}
                        </span>
                        <strong>
                          {formatPrice(row.unitPrice)} / {unit}
                        </strong>
                      </div>
                    ))}
                  </section>
                )}
                {highlights.length === 0 && features.length === 0 && applications.length === 0 && quantityBreaks.length === 0 && (
                  <p>Product highlights have not been added yet.</p>
                )}
              </div>
            </details>
          <details className="shared-product-accordion">
              <summary>Product Description</summary>
              <div className="shared-product-accordion-content">
                <p>{description || "A product description has not been added yet."}</p>
              </div>
            </details>
        <details className="shared-product-accordion">
          <summary>FAQs</summary>
          <div className="shared-product-accordion-content">
            {faqEntries.length ? faqEntries.map((entry) => (
              <section key={entry.question}>
                <h3>{entry.question}</h3>
                <p>{entry.answer}</p>
              </section>
            )) : <p>There are no published FAQs at the moment.</p>}
            <p><SurfaceLink to="/faq" preview={preview}>View all FAQs</SurfaceLink></p>
          </div>
        </details>
        <details className="shared-product-accordion">
          <summary>Returns &amp; Exchange Policy</summary>
          <div className="shared-product-accordion-content">
            {returnPolicy?.published && returnPolicy.sections?.length ? returnPolicy.sections.map((section, index) => (
              <section key={`${section.heading}-${index}`}>
                <h3>{section.heading}</h3>
                <p style={{ whiteSpace: "pre-line" }}>{section.body}</p>
              </section>
            )) : <p>Return policy details are being updated.</p>}
            <p><SurfaceLink to="/return-policy" preview={preview}>Read full Returns &amp; Exchange Policy</SurfaceLink></p>
          </div>
        </details>
      </div>
      {afterAction}
    </>
  );

  return (
    <div className="shared-product-detail-shell">
      <article className={`shared-product-detail${preview ? ` is-preview${actionDisabled ? " is-action-disabled" : ""}` : ""}`}>
        <div className="shared-product-gallery">
          <div className="shared-product-image">
            {showPhotoBanner && (
              <span className="shared-product-photo-banner">{photoBanner}</span>
            )}
            {activeImage ? (
              <img src={activeImage} alt={title} />
            ) : (
              <span>Product photo</span>
            )}
          </div>
          {images.length > 1 && (
            <div
              className="shared-product-thumbnails"
              aria-label="Product images"
            >
              {images.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  className={image === activeImage ? "is-active" : ""}
                  onClick={() => onImageSelect?.(image)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="shared-product-information">
          <div className="shared-product-kicker">
            <span>{category}</span>
            {code && <span title={code}>SKU · {code}</span>}
          </div>
          <div className="shared-product-brand-line">
            {brandMark || (
              <span className="shared-product-brand-mark">
                {brand.slice(0, 1).toUpperCase() || "B"}
              </span>
            )}
            <div>
              <strong>{brand}</strong>
              {brandTagline && <small>{brandTagline}</small>}
            </div>
          </div>
          <h1>{title}</h1>
          {grade && <span className="shared-product-grade">{grade}</span>}
        </div>

        {preview ? (
          <div className="shared-product-buy-box">{buyBoxContent}</div>
        ) : (
          <form className="shared-product-buy-box" onSubmit={onSubmit}>
            {buyBoxContent}
          </form>
        )}
      </article>
    </div>
  );
}
