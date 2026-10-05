import { materialId } from "../ids";
import { useCustomer } from '../customer';
import { emailLink, productMessage, whatsappLink } from '../messages';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Check,
  Info,
  Truck,
  MessageCircle,
  FileText,
  Building2,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';
import ProductImage from './ProductImage';
import { useSiteContent } from '../site-content';

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  inBOM,
  onToggleBOM,
}: { product: CatalogueProduct | null; isOpen: boolean; onClose: () => void; inBOM: boolean; onToggleBOM: (product: MaterialItem) => void }) {
  const { items, updateItems, ready, canEdit, error } = useCustomer();
  const siteContent = useSiteContent();
  const [specification, setSpecification] = useState('');
  const [quantity, setQuantity] = useState(() => String(Math.max(1, Number(product?.variants?.[0]?.minOrderQuantity || product?.minOrderQty?.match(/[\d.]+/)?.[0] || 0))));
  const [added, setAdded] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  useEffect(() => { setSpecification(''); setQuantity(String(Math.max(1, Number(product?.variants?.[0]?.minOrderQuantity || product?.minOrderQty?.match(/[\d.]+/)?.[0] || 0)))); setAdded(false); setSelectedVariantId(''); setSelectedImage(''); }, [product?.id]);
  // Lock background scroll, pause Lenis / Locomotive scroll, and handle ESC
  useEffect(() => {
    if (!isOpen || !product) return;

    if (window.__lenis && typeof window.__lenis.stop === 'function') {
      window.__lenis.stop();
    }
    if (window.__locomotiveScroll && typeof window.__locomotiveScroll.stop === 'function') {
      window.__locomotiveScroll.stop();
    }

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);

      if (window.__lenis && typeof window.__lenis.start === 'function') {
        window.__lenis.start();
      }
      if (window.__locomotiveScroll && typeof window.__locomotiveScroll.start === 'function') {
        window.__locomotiveScroll.start();
      }
    };
  }, [isOpen, product, onClose]);

  if (!isOpen || !product) return null;

  const brandMeta = getBrandMeta(product.brand);
  const variants = product.variants || [];
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) || variants[0];
  const technicalSpecs = Object.entries({
    ...(product.specs || {}),
    ...(selectedVariant?.attributes || {}),
  }).filter(([, value]) => String(value ?? '').trim());
  const applications = (product.applications || []).filter(value => value.trim());
  const features = (product.features || []).filter(value => value.trim());
  const gallery = Array.from(new Set([...(product.galleryImages || []), product.image].filter((image): image is string => Boolean(image))));
  const activeImage = selectedImage || gallery[0] || null;
  const selectedLabel = [selectedVariant?.label, specification.trim()].filter(Boolean).join(' · ');
  const basePrice = selectedVariant?.price ?? product.price;
  const quantityBreaks = (selectedVariant?.quantityBreaks || []).slice().sort((a, b) => Number(a.minimumQuantity) - Number(b.minimumQuantity));
  const matchedBreak = quantityBreaks.filter(row => Number(quantity) >= Number(row.minimumQuantity)).at(-1);
  const price = matchedBreak?.unitPrice ?? basePrice;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const unit = selectedVariant?.unit || product.unit;
  const selectedInStock = selectedVariant ? selectedVariant.inStock : product.inStock;
  const selectedAvailability = selectedVariant?.availabilityStatus || product.availabilityStatus || (selectedInStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY');
  const minimumOrder = Number(selectedVariant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0) || 0;
  const enquiryMessage = productMessage({...product, unit, specification: selectedLabel});
  const waProductUrl = whatsappLink(enquiryMessage, siteContent["contact.phone"]);
  const emailProductUrl = emailLink("Material Square — Product Enquiry", enquiryMessage, siteContent["contact.email"]);

  return (
    <div className="ms-modal-backdrop" onClick={onClose} data-lenis-prevent>
      <div
        className="ms-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-prod-title"
        data-lenis-prevent
      >
        <button
          type="button"
          className="modal-dismiss-btn"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={20} />
        </button>

        <div className="modal-content-grid">
          {/* Left Column: Visual & Verification */}
          <div className="modal-left-media">
            <div className="modal-img-container">
              {selectedLabel && <span className="selected-size-badge">Selected: {selectedLabel}</span>}
              <ProductImage src={activeImage} alt={product.name} loading="eager" />
              <div className="modal-brand-overlay">
                <div className="modal-brand-tag-with-logo">
                  <div className="modal-brand-mini-logo">
                    <BrandLogo id={brandMeta?.id || product.brand} className="modal-logo-svg" />
                  </div>
                  <span className="brand-pill">{product.brand}</span>
                </div>
              </div>
            </div>

            {gallery.length > 1 && <div className="catalogue-gallery-thumbnails" aria-label="Product images">
              {gallery.map((image, index) => <button type="button" key={`${image}-${index}`} className={image === activeImage ? 'is-active' : ''} onClick={() => setSelectedImage(image)} aria-label={`View product image ${index + 1}`}><ProductImage src={image} alt="" /></button>)}
            </div>}

            <div className="modal-dispatch-box">
              <div className="dispatch-row">
                <Truck size={16} />
                <span><strong>Delivery:</strong> Confirm timing and site availability with staff</span>
              </div>
              <div className="dispatch-row">
                <Info size={16} />
                <span><strong>Product details:</strong> Confirm the exact variant and supporting documents with staff</span>
              </div>
            </div>

            <div className="modal-actions-stack">
              {waProductUrl && <a
                href={waProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-block"
              >
                <WhatsAppIcon size={18} color="#ffffff" />
                <span>Ask about this product on WhatsApp</span>
              </a>}
              {emailProductUrl && <a href={emailProductUrl} className="btn btn-secondary btn-block">
                <Mail size={17} /> <span>Email about this product</span>
              </a>}

              <form className="customer-form product-options" onSubmit={event => {
                event.preventDefault();
                const value = Number(quantity);
                if (!ready || !Number.isFinite(value) || value <= 0 || value > 1000000) return;
                const selection = specification.trim();
                const accepted = updateItems(old => {
                  const existing = old.find(item => (item.catalogueId || item.id) === product.id && (item.variantId || '') === (selectedVariant?.id || '') && (item.specification || '') === selectedLabel);
                  const item = {...product, ...(selectedVariant ? { price, compareAtPrice: selectedVariant.compareAtPrice, priceNote: selectedVariant.priceNote, unit, inStock: selectedVariant.inStock, variantId: selectedVariant.id } : {}), catalogueId: product.id, id: existing?.id || `${product.id}-${materialId()}`, specification: selectedLabel, quantity: value};
                  return existing ? old.map(row => row.id === existing.id ? item : row) : [...old, item];
                });
                setAdded(accepted);
              }}>
                {variants.length > 0 && <label>Choose size, pack or colour
                    <select required value={selectedVariant?.id || ''} onChange={event => { const nextVariant = variants.find(variant => variant.id === event.target.value); const nextMinimum = Number(nextVariant?.minOrderQuantity || product.minOrderQty?.match(/[\d.]+/)?.[0] || 0); setSelectedVariantId(event.target.value); if (nextMinimum > 0 && Number(quantity) < nextMinimum) setQuantity(String(nextMinimum)); setAdded(false); }}>
                    {variants.map(variant => { const status = variant.availabilityStatus || (variant.inStock ? 'IN_STOCK' : 'CHECK_AVAILABILITY'); return <option key={variant.id} value={variant.id}>{variant.label}{variant.price != null ? ` · ₹${Number(variant.price).toLocaleString('en-IN')}` : ''}{status === 'OUT_OF_STOCK' ? ' · Out of stock' : status === 'CHECK_AVAILABILITY' ? ' · Check availability' : ''}</option>; })}
                  </select>
                </label>}
                {!variants.length && <label>Required size / specification{product.specs?.sizes ? ' *' : ' (optional)'}
                  <input required={Boolean(product.specs?.sizes)} maxLength={500} value={specification} placeholder="Enter your required size or variant" onChange={e=>{setSpecification(e.target.value);setAdded(false);}}/>
                </label>}
                <label>Quantity ({unit}){minimumOrder > 0 ? ` · minimum ${minimumOrder}` : ''}
                  <input type="number" min={minimumOrder > 0 ? minimumOrder : 0.001} max="1000000" step="any" required value={quantity} onChange={e=>{setQuantity(e.target.value);setAdded(false);}}/>
                </label>
                <button disabled={!canEdit} className="btn btn-orange btn-block">{items.some(item => (item.catalogueId || item.id) === product.id && (item.variantId || '') === (selectedVariant?.id || '') && (item.specification || '') === selectedLabel) ? 'Update this size in quote list' : 'Add this selection to quote list'}</button>
                {error && <p role="alert" className="customer-help">{error}</p>}
                {added && !error && <p role="status" className="customer-help">Selection added. You can enter another size and quantity to add a separate line.</p>}
              </form>
            </div>
          </div>

          {/* Right Column: Technical Engineering Specifications */}
          <div className="modal-right-specs">
            <div className="modal-header-block">
              <div className="modal-tags-row">
                <span className="badge-orange mono">{product.code}</span>
                <span className="badge-dark">{product.categoryLabel}</span>
              </div>

              <div className="modal-brand-official-banner">
                <div className="modal-brand-logo-box">
                  <BrandLogo id={brandMeta?.id || product.brand} className="modal-header-logo-svg" />
                </div>
                <div className="modal-brand-text-col">
                  <span className="modal-brand-official-tagline">{product.categoryLabel}</span>
                  <span className="modal-factory-direct-guarantee">
                    Product listing in the current catalogue
                  </span>
                </div>
              </div>

              <h2 id="modal-prod-title" className="modal-title">{product.name}</h2>
            </div>

            <div className="modal-rate-strip">
              <div>
                <span className="rate-k">Pricing:</span>
                <div className="rate-big mono">{price == null ? 'Request a quotation' : <>₹{Number(price).toLocaleString('en-IN')} <small>/ {unit}</small>{compareAtPrice != null && Number(compareAtPrice) > Number(price) && <del>₹{Number(compareAtPrice).toLocaleString('en-IN')}</del>}</>}</div>
                {(selectedVariant?.offerLabel || product.offerLabel) && <span className="catalogue-offer-badge">{selectedVariant?.offerLabel || product.offerLabel}</span>}
                {(selectedVariant?.priceNote || product.priceNote) && <small className="catalogue-price-caveat">{selectedVariant?.priceNote || product.priceNote}</small>}
              </div>
              <span className="moq-pill">{selectedAvailability === 'IN_STOCK' ? (selectedVariant?.stockQuantity != null ? `In stock · ${selectedVariant.stockQuantity} available` : 'In stock') : selectedAvailability === 'OUT_OF_STOCK' ? 'Out of stock' : 'Availability to confirm'}{minimumOrder > 0 ? ` · Min order: ${minimumOrder} ${unit}` : product.minOrderQty ? ` · Min order: ${product.minOrderQty}` : ''}</span>
            </div>

            {quantityBreaks.length > 0 && <div className="product-options" aria-label="Quantity discount prices">
              <h4 className="spec-table-heading">Quantity prices ({unit})</h4>
              <div className="spec-table">
                {quantityBreaks.map(row => <div className="spec-table-row" key={`${row.minimumQuantity}-${row.unitPrice}`}>
                  <span className="spec-name">Buy {Number(row.minimumQuantity).toLocaleString('en-IN')}+</span>
                  <span className="spec-value mono">₹{Number(row.unitPrice).toLocaleString('en-IN')} / {unit}</span>
                </div>)}
              </div>
              <small className="catalogue-price-caveat">{matchedBreak ? `Applied rate for ${Number(quantity).toLocaleString('en-IN')} ${unit}: ₹${Number(price).toLocaleString('en-IN')} each.` : `Add the listed quantity to get that unit rate.`} Preview rates; confirm the current offer with staff.</small>
            </div>}

            {/* Technical Parameters Table */}
            {technicalSpecs.length > 0 && <div className="modal-spec-table-wrap">
              <h4 className="spec-table-heading">Technical & Testing Parameters</h4>
              <div className="spec-table">
                {technicalSpecs.map(([key, val]) => (
                  <div key={key} className="spec-table-row">
                    <span className="spec-name">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                    <span className="spec-value mono">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>}

            {/* Approved Site Applications */}
            {applications.length > 0 && <div className="modal-applications-box">
              <h4 className="spec-table-heading">Recommended Site Applications</h4>
              <div className="app-chips-row">
                {applications.map((app, i) => (
                  <span key={i} className="app-chip">
                    <CheckCircle2 size={13} /> {app}
                  </span>
                ))}
              </div>
            </div>}

            {/* Key Advantages */}
            {features.length > 0 && <div className="modal-advantages-box">
              <h4 className="spec-table-heading">Performance Features</h4>
              <ul className="modal-features-ul">
                {features.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}
