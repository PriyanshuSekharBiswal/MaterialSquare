import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
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

export default function ProductDetailPage({ products, loading = false }: { products: CatalogueProduct[]; loading?: boolean }) {
  const { productId } = useParams();
  const product = products.find((item) => item.id === productId);
  const { items, updateItems, ready, canEdit, error } = useCustomer();
  const siteContent = useSiteContent();
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSpecification("");
    setQuantity(String(Math.max(1, Number(product.variants?.[0]?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0))));
    setSelectedVariantId("");
    setSelectedImage("");
    setAdded(false);
    trackWebsiteEvent({ type: "product_view", target: product.id });
  }, [product?.id]);

  const variants = product?.variants || [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || variants[0];
  const technicalSpecs = useMemo(() => Object.entries({
    ...(product?.specs || {}),
    ...(selectedVariant?.attributes || {}),
  }).filter(([, value]) => String(value ?? "").trim()), [product, selectedVariant]);

  if (!product && loading) return <p className="page-loading-state container" role="status">Loading product details…</p>;
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
  const gallery = Array.from(new Set([...(product.galleryImages || []), product.image].filter((image): image is string => Boolean(image))));
  const activeImage = selectedImage || gallery[0] || null;
  const selectedLabel = [selectedVariant?.label, specification.trim()].filter(Boolean).join(" · ");
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
        ...(selectedVariant ? { price, compareAtPrice: selectedVariant.compareAtPrice, priceNote: selectedVariant.priceNote, unit, inStock: selectedVariant.inStock, variantId: selectedVariant.id } : {}),
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
          <div className="product-detail-kicker"><span>{product.categoryLabel}</span><span>SKU · {product.code}</span></div>
          <div className="product-detail-brand-line"><BrandLogo id={brandMeta?.id || product.brand} /><div><strong>{product.brand}</strong><small>{product.brandTagline || "Authorised partner brand"}</small></div></div>
          <h1>{product.name}</h1>
          {product.description && <p className="product-detail-description">{product.description}</p>}
          <div className="product-detail-offer-row">
            <div><span className="rate-k">{price == null ? "Pricing" : `Price per ${unit}`}</span><strong className="product-detail-price">{price == null ? "Request a quotation" : `₹${Number(price).toLocaleString("en-IN")}`}{price != null && compareAtPrice != null && Number(compareAtPrice) > Number(price) && <del>₹{Number(compareAtPrice).toLocaleString("en-IN")}</del>}</strong>
              {(selectedVariant?.offerLabel || product.offerLabel) && <span className="catalogue-offer-badge">{selectedVariant?.offerLabel || product.offerLabel}</span>}
              {(selectedVariant?.priceNote || product.priceNote) && <small className="catalogue-price-caveat">{selectedVariant?.priceNote || product.priceNote}</small>}
            </div>
            <span className={`product-detail-stock status-${availability.toLowerCase().replaceAll("_", "-")}`}>{availability === "IN_STOCK" ? (selectedVariant?.stockQuantity != null ? `In stock · ${selectedVariant.stockQuantity} available` : "In stock") : availability === "OUT_OF_STOCK" ? "Out of stock" : "Check availability"}</span>
          </div>
          {minimumOrder > 0 && <p className="product-detail-moq"><Package size={15} />Minimum order: {minimumOrder} {unit}</p>}

          {quantityBreaks.length > 0 && <section className="product-detail-spec-block"><h2>Quantity prices</h2>{quantityBreaks.map((row) => <div className="product-detail-spec-row" key={`${row.minimumQuantity}-${row.unitPrice}`}><span>{Number(row.minimumQuantity).toLocaleString("en-IN")}+ {unit}</span><strong>₹{Number(row.unitPrice).toLocaleString("en-IN")} / {unit}</strong></div>)}</section>}
          {technicalSpecs.length > 0 && <section className="product-detail-spec-block"><h2>Specifications</h2>{technicalSpecs.map(([key, value]) => <div className="product-detail-spec-row" key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}</section>}
          {product.features.length > 0 && <section className="product-detail-spec-block"><h2>Product features</h2><ul className="product-detail-list">{product.features.map((feature) => <li key={feature}><Check size={15} />{feature}</li>)}</ul></section>}
          {product.applications.length > 0 && <section className="product-detail-spec-block"><h2>Applications</h2><ul className="product-detail-list">{product.applications.map((application) => <li key={application}><Check size={15} />{application}</li>)}</ul></section>}

          <form className="product-detail-buy-box" onSubmit={addSelection}>
            {variants.length > 0 && <label>Choose size, pack or colour<select required value={selectedVariant?.id || ""} onChange={(event) => { const next = variants.find((variant) => variant.id === event.target.value); const min = Number(next?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0); setSelectedVariantId(event.target.value); if (min > Number(quantity)) setQuantity(String(min)); setAdded(false); }}>{variants.map((variant) => { const state = variant.availabilityStatus || (variant.inStock ? "IN_STOCK" : "CHECK_AVAILABILITY"); return <option key={variant.id} value={variant.id}>{variant.label}{variant.price != null ? ` · ₹${Number(variant.price).toLocaleString("en-IN")}` : ""}{state === "OUT_OF_STOCK" ? " · Out of stock" : state === "CHECK_AVAILABILITY" ? " · Check availability" : ""}</option>; })}</select></label>}
            {!variants.length && <label>Required size / specification{product.specs?.sizes ? " *" : " (optional)"}<input required={Boolean(product.specs?.sizes)} maxLength={500} value={specification} placeholder="Enter your required size or variant" onChange={(event) => { setSpecification(event.target.value); setAdded(false); }} /></label>}
            <div className="product-detail-quantity-row"><label>Quantity ({unit})<input type="number" min={minimumOrder > 0 ? minimumOrder : 0.001} max="1000000" step="any" required value={quantity} onChange={(event) => { setQuantity(event.target.value); setAdded(false); }} /></label>
              <button disabled={!canEdit || !ready} className="btn btn-orange">{inList ? "Update material list" : "Add to Material List"}<ArrowRight size={16} /></button>
            </div>
            {error && <p role="alert" className="customer-help">{error}</p>}
            {added && !error && <p role="status" className="product-added-confirmation">Added to your Material List. <Link to="/material-list">Review list <ArrowRight size={14} /></Link></p>}
          </form>
        </div>
      </article>

      {relatedProducts.length > 0 && <section className="product-page-related" aria-label="Similar products">
        <div className="product-related-heading"><div><span>Continue browsing</span><h2>Similar {product.categoryLabel.toLowerCase()} products</h2></div><Link to={`/marketplace?category=${encodeURIComponent(product.category)}`}>View all <ArrowRight size={14} /></Link></div>
        <div className="product-related-grid">{relatedProducts.map((item) => <Link className="product-related-card" key={item.id} to={`/product/${encodeURIComponent(item.id)}`}><ProductImage src={item.image} alt={item.name} /><span className="product-related-brand">{item.brand}</span><strong>{item.name}</strong><small>{item.price != null ? `₹${Number(item.price).toLocaleString("en-IN")} / ${item.unit}` : "Request a quotation"}</small></Link>)}</div>
      </section>}
    </section>
  );
}
