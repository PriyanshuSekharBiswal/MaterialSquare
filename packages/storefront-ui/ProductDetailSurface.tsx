import type { FormEvent, ReactNode } from "react";
import { ArrowRight, ChevronDown, PackagePlus } from "lucide-react";
import { Link } from "react-router-dom";
import type { FaqEntry, WebsitePolicy } from "@material-square/types";
import { formatQuantityUnit } from "./formatQuantityUnit";
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
          Minimum order: {formatQuantityUnit(minimumOrder, unit)}
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
              {preview ? (
                <div className="shared-product-choice-select-value">
                  <span>{group.selectedValue || "Choose an option"}</span>
                  <ChevronDown aria-hidden="true" size={18} />
                </div>
              ) : (
                <details className="shared-product-choice-dropdown">
                  <summary aria-label={`Choose ${group.label}`}>
                    <span>{group.selectedValue || "Choose an option"}</span>
                    <ChevronDown aria-hidden="true" size={18} />
                  </summary>
                  <div className="shared-product-choice-menu" role="listbox" aria-label={group.label}>
                    {group.choices.map((choice) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected={choice.label === group.selectedValue}
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
              )}
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
                    disabled={choice.disabled || preview}
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
      {!preview && onQuantityChange && (
        <div className="shared-product-quantity-row">
          <label>
            <span>Quantity ({unit})</span>
            <input
              type="number"
              min={
                minimumOrder && Number(minimumOrder) > 0 ? minimumOrder : 0.001
              }
              max="1000000"
              step="any"
              required
              value={quantity}
              onChange={(event) => onQuantityChange(event.target.value)}
            />
          </label>
          <button disabled={actionDisabled} className="shared-product-action">
            <PackagePlus size={16} />
            {actionLabel}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      {preview && (
        <>
          <label className="shared-product-quantity">
            <span>Quantity ({unit})</span>
            <input type="text" value={quantity} readOnly />
          </label>
          <button type="button" className="shared-product-action" disabled>
            <PackagePlus size={16} />
            Add to Material List
            <ArrowRight size={16} />
          </button>
        </>
      )}

      <p className="shared-product-shipping-note">
        Incl GST <Link to="/shipping">Shipping</Link> calculated at checkout.
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
            <p><Link to="/faq">View all FAQs</Link></p>
          </div>
        </details>
        <details className="shared-product-accordion">
          <summary>Returns &amp; Exchange Policy</summary>
          <div className="shared-product-accordion-content">
            {returnPolicy?.sections.map((section, index) => (
              <section key={`${section.heading}-${index}`}>
                <h3>{section.heading}</h3>
                <p style={{ whiteSpace: "pre-line" }}>{section.body}</p>
              </section>
            )) || <p>Return policy details are being updated.</p>}
            <p><Link to="/return-policy">Read full Returns &amp; Exchange Policy</Link></p>
          </div>
        </details>
      </div>
      {afterAction}
    </>
  );

  return (
    <article className={`shared-product-detail${preview ? " is-preview" : ""}`}>
      <div className="shared-product-gallery">
        <div className="shared-product-image">
          {photoBanner && (
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
                disabled={preview}
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
  );
}
