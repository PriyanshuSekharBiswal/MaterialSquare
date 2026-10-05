import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Info, Mail, Package, Truck } from "lucide-react";
import { materialId } from "../ids";
import { useCustomer } from "../customer";
import { emailLink, productMessage, whatsappLink } from "../messages";
import { trackWebsiteEvent } from "../analytics";
import { useSiteContent } from "../site-content";
import type { CatalogueProduct, MaterialItem } from "../types";
import ProductImage from "../components/ProductImage";
import { BrandLogo, getBrandMeta } from "../components/icons/BrandBadges";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import { bestMatchingVariant } from "../search/variant-match";

export default function ProductDetailPage({ products, loading = false, catalogueUnavailable = false, onRetryCatalogue }: { products: CatalogueProduct[]; loading?: boolean; catalogueUnavailable?: boolean; onRetryCatalogue?: () => void }) {
  const { productId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedVariantId = searchParams.get("variant") || "";
  const searchQuery = searchParams.get("q") || "";
  const product = products.find((item) => item.id === productId);
  const { items, updateItems, ready, canEdit, error } = useCustomer();
  const siteContent = useSiteContent();
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [added, setAdded] = useState(false);
  const initializedSelection = useRef("");

  useEffect(() => {
    if (!product) return;
    const queryKey = `${product.id}:${searchQuery}`;
    if (initializedSelection.current === queryKey) {
      const selectedFromUrl = product.variants?.find((variant) => variant.id === requestedVariantId);
      if (selectedFromUrl) setSelectedVariantId(selectedFromUrl.id);
      return;
    }
    initializedSelection.current = queryKey;
    setSpecification("");
    const requested = product.variants?.find((variant) => variant.id === requestedVariantId);
    const matched = requested || bestMatchingVariant(product, searchQuery);
    const initial = matched || product.variants?.find((variant) => variant.inStock) || product.variants?.[0];
    setQuantity(String(Math.max(1, Number(initial?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0))));
    setSelectedVariantId(initial?.id || "");
    setSelectedImage("");
    setAdded(false);
    trackWebsiteEvent({ type: "product_view", target: product.id });
  }, [product?.id, requestedVariantId, searchQuery]);

  const variants = product?.variants || [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0];
  const optionGroups = useMemo(() => {
    const values = new Map<string, { label: string; values: string[] }>();
    for (const variant of variants) for (const [rawKey, rawValue] of Object.entries(variant.attributes || {})) {
      const label = rawKey.trim();
      const value = String(rawValue || "").trim();
      if (!label || !value) continue;
      const key = label.toLocaleLowerCase();
      const group = values.get(key) || { label, values: [] };
      if (!group.values.some((existing) => existing.toLocaleLowerCase() === value.toLocaleLowerCase())) group.values.push(value);
      values.set(key, group);
    }
    return Array.from(values.entries()).map(([key, group]) => ({ key, ...group }));
  }, [variants]);
  const technicalSpecs = useMemo(() => Object.entries({
    ...(product?.specs || {}),
    ...(selectedVariant?.attributes || {}),
  }).filter(([, value]) => String(value ?? "").trim()), [product, selectedVariant]);

  if (!product && loading) return <p className="page-loading-state container" role="status">Loading product details…</p>;
  if (!product && catalogueUnavailable) return (
    <section className="product-route-empty container" role="alert">
      <span className="badge-pill badge-orange-pill">Catalogue unavailable</span>
      <h1>We couldn’t load the published inventory.</h1>
      <p>Please try again in a moment. No sample products are shown.</p>
      {onRetryCatalogue && <button className="btn btn-orange" type="button" onClick={onRetryCatalogue}>Retry inventory <ArrowRight size={16} /></button>}
    </section>
  );
  if (!product) return (
    <section className="product-route-empty container">
      <span className="badge-pill badge-orange-pill">Product unavailable</span>
      <h1>This product is no longer in the catalogue.</h1>
      <p>It may have been unpublished or its details may have changed.</p>
      <Link className="btn btn-orange" to="/marketplace">Browse the catalogue <ArrowRight size={16} /></Link>
    </section>
  );

  const currentProduct = product;

  const brandMeta = getBrandMeta(product.brand);
  const gallery = Array.from(new Set([...(selectedVariant?.galleryImages || []), selectedVariant?.image, ...(product.galleryImages || []), product.image].filter((image): image is string => Boolean(image))));
  const activeImage = selectedImage || gallery[0] || null;
  const selectedLabel = [selectedVariant?.label, ...Object.entries(selectedVariant?.attributes || {}).map(([key, value]) => `${key}: ${value}`), specification.trim()].filter(Boolean).join(" · ");
  const quantityBreaks = (selectedVariant?.quantityBreaks || []).slice().sort((a, b) => Number(a.minimumQuantity) - Number(b.minimumQuantity));
  const matchedBreak = quantityBreaks.filter((row) => Number(quantity) >= Number(row.minimumQuantity)).at(-1);
  const price = matchedBreak?.unitPrice ?? selectedVariant?.price ?? product.price;
  const unit = selectedVariant?.unit || product.unit;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const availability = selectedVariant?.availabilityStatus || product.availabilityStatus || ((selectedVariant?.inStock ?? product.inStock) ? "IN_STOCK" : "CHECK_AVAILABILITY");
  const minimumOrder = Number(selectedVariant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0) || 0;
  const relatedProducts = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 8);
  const enquiryMessage = productMessage({ ...product, unit, specification: selectedLabel });
  const waProductUrl = whatsappLink(enquiryMessage, siteContent["contact.phone"]);
  const emailProductUrl = emailLink("Material Square — Product Enquiry", enquiryMessage, siteContent["contact.email"]);
  const inList = items.some((item) => (item.catalogueId || item.id) === product.id && (item.variantId || "") === (selectedVariant?.id || "") && (item.specification || "") === selectedLabel);

  function addSelection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(quantity);
    if (!ready || !Number.isFinite(value) || value <= 0 || value > 1_000_000) return;
    const accepted = updateItems((old) => {
      const existing = old.find((item) => (item.catalogueId || item.id) === currentProduct.id && (item.variantId || "") === (selectedVariant?.id || "") && (item.specification || "") === selectedLabel);
      const item: MaterialItem = {
        ...currentProduct,
        ...(selectedVariant ? { price, compareAtPrice: selectedVariant.compareAtPrice, priceNote: selectedVariant.priceNote, unit, inStock: selectedVariant.inStock, variantId: selectedVariant.id, minOrderQuantity: selectedVariant.minOrderQuantity, image: selectedVariant.image || currentProduct.image, galleryImages: selectedVariant.galleryImages || currentProduct.galleryImages } : {}),
        catalogueId: currentProduct.id,
        id: existing?.id || `${currentProduct.id}-${materialId()}`,
        specification: selectedLabel,
        quantity: value,
      };
      return existing ? old.map((row) => row.id === existing.id ? item : row) : [...old, item];
    });
    if (accepted && !inList) trackWebsiteEvent({ type: "add_to_list", target: currentProduct.id });
    setAdded(accepted);
  }

  function selectVariant(variant: (typeof variants)[number]) {
    const minimum = Number(variant.minOrderQuantity || product?.minOrderQty?.match(/[\d.]+/)?.[0] || 0);
    setSelectedVariantId(variant.id);
    setSelectedImage(variant.image || "");
    if (minimum > Number(quantity)) setQuantity(String(minimum));
    setAdded(false);
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("variant", variant.id);
      return next;
    }, { replace: true });
  }

  function bestVariantForAttribute(groupKey: string, value: string) {
    const selectedAttributes = selectedVariant?.attributes || {};
    const candidates = variants.filter((variant) => Object.entries(variant.attributes || {}).some(([key, candidate]) => key.trim().toLocaleLowerCase() === groupKey && String(candidate).toLocaleLowerCase() === value.toLocaleLowerCase()));
    return candidates.sort((a, b) => {
      const score = (variant: (typeof variants)[number]) => Object.entries(selectedAttributes).filter(([key, current]) => key.trim().toLocaleLowerCase() !== groupKey && Object.entries(variant.attributes || {}).some(([otherKey, otherValue]) => otherKey.trim().toLocaleLowerCase() === key.trim().toLocaleLowerCase() && String(otherValue).toLocaleLowerCase() === String(current).toLocaleLowerCase())).length;
      const available = (variant: (typeof variants)[number]) => (variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY")) === "IN_STOCK" ? 1 : 0;
      return score(b) - score(a) || available(b) - available(a) || a.sortOrder - b.sortOrder;
    })[0];
  }

  function selectAttribute(groupKey: string, value: string) {
    const best = bestVariantForAttribute(groupKey, value);
    if (best) selectVariant(best);
  }

  return (
    <section className="product-detail-page container">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span>/</span><Link to={`/marketplace?brand=${encodeURIComponent(product.brand)}`}>{product.brand}</Link><span>/</span><span aria-current="page">{product.name}</span>
      </nav>
      <Link className="product-back-link" to={`/marketplace?brand=${encodeURIComponent(product.brand)}`}><ArrowLeft size={16} /> Back to {product.brand} products</Link>

      <article className="product-detail-card">
        <div className="product-detail-gallery">
          <div className="product-detail-image">
            {selectedLabel && <span className="selected-size-badge">Selected: {selectedLabel}</span>}
            <ProductImage src={activeImage} alt={product.name} loading="eager" />
            <span className="product-detail-brand-mark"><BrandLogo id={brandMeta?.id || product.brand} /> {product.brand}</span>
          </div>
          {gallery.length > 1 && <div className="catalogue-gallery-thumbnails" aria-label="Product images">
            {gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={image === activeImage ? "is-active" : ""} onClick={() => setSelectedImage(image)} aria-label={`View product image ${index + 1}`}><ProductImage src={image} alt="" /></button>)}
          </div>}
          <div className="product-detail-assurance">
            <div><Truck size={17} /><span><strong>Delivery</strong>Confirm timing and site availability with the team.</span></div>
            <div><Info size={17} /><span><strong>Product information</strong>Confirm exact specifications and documents before ordering.</span></div>
          </div>
          {waProductUrl && <a href={waProductUrl} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-block"><WhatsAppIcon size={18} color="#ffffff" />Ask about this product</a>}
          {emailProductUrl && <a href={emailProductUrl} className="btn btn-secondary btn-block"><Mail size={17} />Email about this product</a>}
        </div>

        <div className="product-detail-information">
          <div className="product-detail-kicker"><span>{product.categoryLabel}</span>{product.code && <span>SKU · {product.code}</span>}</div>
          <div className="product-detail-brand-line"><BrandLogo id={brandMeta?.id || product.brand} /><div><strong>{product.brand}</strong>{product.brandTagline && <small>{product.brandTagline}</small>}</div></div>
          <h1>{product.name}</h1>
          {product.description && <p className="product-detail-description">{product.description}</p>}
          {quantityBreaks.length > 0 && <section className="product-detail-spec-block"><h2>Quantity prices</h2>{quantityBreaks.map((row) => <div className="product-detail-spec-row" key={`${row.minimumQuantity}-${row.unitPrice}`}><span>{Number(row.minimumQuantity).toLocaleString("en-IN")}+ {unit}</span><strong>₹{Number(row.unitPrice).toLocaleString("en-IN")} / {unit}</strong></div>)}</section>}
          {technicalSpecs.length > 0 && <section className="product-detail-spec-block"><h2>Specifications</h2>{technicalSpecs.map(([key, value]) => <div className="product-detail-spec-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</section>}
          {product.features.length > 0 && <section className="product-detail-spec-block"><h2>Product features</h2><ul className="product-detail-list">{product.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></section>}
          {product.applications.length > 0 && <section className="product-detail-spec-block"><h2>Applications</h2><ul className="product-detail-list">{product.applications.map((application) => <li key={application}><Check size={15} />{application}</li>)}</ul></section>}

        </div>

        <form className="product-detail-buy-box" onSubmit={addSelection}>
            <div className="product-detail-buy-heading"><span>Configure your selection</span><strong>{selectedVariant?.label || selectedLabel || "Choose a product option"}</strong><small>Options and pricing reflect the selected product combination.</small></div>
            <div className="product-detail-offer-row">
              <div><span className="rate-k">{price == null ? "Pricing" : `Price per ${unit}`}</span><strong className="product-detail-price">{price == null ? "Request a quotation" : `₹${Number(price).toLocaleString("en-IN")}`}{price != null && compareAtPrice != null && Number(compareAtPrice) > Number(price) && <del>₹{Number(compareAtPrice).toLocaleString("en-IN")}</del>}</strong>
                {(selectedVariant?.offerLabel || product.offerLabel) && <span className="catalogue-offer-badge">{selectedVariant?.offerLabel || product.offerLabel}</span>}
                {(selectedVariant?.priceNote || product.priceNote) && <small className="catalogue-price-caveat">{selectedVariant?.priceNote || product.priceNote}</small>}
              </div>
              <span className={`product-detail-stock status-${availability.toLowerCase().replaceAll("_", "-")}`}>{availability === "IN_STOCK" ? (selectedVariant?.stockQuantity != null ? `In stock · ${selectedVariant.stockQuantity} available` : "In stock") : availability === "OUT_OF_STOCK" ? "Out of stock" : "Check availability"}</span>
            </div>
            {minimumOrder > 0 && <p className="product-detail-moq"><Package size={15} />Minimum order: {minimumOrder} {unit}</p>}
            {optionGroups.length > 0 && <div className="product-option-groups">{optionGroups.map((group) => {
              const selectedValue = Object.entries(selectedVariant?.attributes || {}).find(([key]) => key.trim().toLocaleLowerCase() === group.key)?.[1] || "";
              return <fieldset className="product-option-group" key={group.key}><legend>{group.label}{selectedValue ? <strong>: {selectedValue}</strong> : null}</legend><div className="product-option-values">{group.values.map((value) => {
                const optionVariant = bestVariantForAttribute(group.key, value);
                const optionAvailability = optionVariant?.availabilityStatus || (optionVariant?.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY");
                const unavailable = optionAvailability === "OUT_OF_STOCK";
                const optionPrice = optionVariant?.price ?? product.price;
                return <button type="button" key={value} aria-pressed={selectedValue.toLocaleLowerCase() === value.toLocaleLowerCase()} className={`product-option-chip${selectedValue.toLocaleLowerCase() === value.toLocaleLowerCase() ? " is-selected" : ""}`} onClick={() => selectAttribute(group.key, value)}>{optionVariant?.image && <ProductImage src={optionVariant.image} alt="" />}<span>{value}<small>{optionPrice != null ? `₹${Number(optionPrice).toLocaleString("en-IN")} / ${optionVariant?.unit || product.unit}` : unavailable ? "Out of stock" : "Request a quotation"}</small></span>{unavailable && optionPrice != null ? <small>Out of stock</small> : null}</button>;
              })}</div></fieldset>;
            })}</div>}
            {variants.length > 0 && optionGroups.length === 0 && <label>Choose size, pack or option<select required value={selectedVariant?.id || ""} onChange={(event) => { const next = variants.find((variant) => variant.id === event.target.value); if (next) selectVariant(next); }}>{variants.map((variant) => { const state = variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY"); return <option key={variant.id} value={variant.id}>{variant.label}{variant.price != null ? ` · ₹${Number(variant.price).toLocaleString("en-IN")}` : ""}{state === "OUT_OF_STOCK" ? " · Out of stock" : state === "CHECK_AVAILABILITY" ? " · Check availability" : ""}</option>; })}</select></label>}
            {!variants.length && <label>Required size / specification{product.specs?.sizes ? " *" : " (optional)"}<input required={Boolean(product.specs?.sizes)} maxLength={500} value={specification} placeholder="Enter your required size or variant" onChange={(event) => { setSpecification(event.target.value); setAdded(false); }} /></label>}
            <div className="product-detail-quantity-row"><label>Quantity ({unit})<input type="number" min={minimumOrder > 0 ? minimumOrder : 0.001} max="1000000" step="any" required value={quantity} onChange={(event) => { setQuantity(event.target.value); setAdded(false); }} /></label>
              <button disabled={!canEdit || !ready} className="btn btn-orange">{inList ? "Update material list" : "Add to Material List"}<ArrowRight size={16} /></button>
            </div>
            {error && <p role="alert" className="customer-help">{error}</p>}
            {added && !error && <p role="status" className="product-added-confirmation">Added to your Material List. <Link to="/material-list">Review list <ArrowRight size={14} /></Link></p>}
          </form>
      </article>

      {relatedProducts.length > 0 && <section className="product-page-related" aria-label="Similar products">
        <div className="product-related-heading"><div><span>Continue browsing</span><h2>Similar {product.categoryLabel.toLowerCase()} products</h2></div><Link to={`/marketplace?category=${encodeURIComponent(product.category)}`}>View all <ArrowRight size={14} /></Link></div>
        <div className="product-related-grid">{relatedProducts.map((item) => <Link className="product-related-card" key={item.id} to={`/product/${encodeURIComponent(item.id)}`}><ProductImage src={item.image} alt={item.name} /><span className="product-related-brand">{item.brand}</span><strong>{item.name}</strong><small>{item.price != null ? `₹${Number(item.price).toLocaleString("en-IN")} / ${item.unit}` : "Request a quotation"}</small></Link>)}</div>
      </section>}
    </section>
  );
}
