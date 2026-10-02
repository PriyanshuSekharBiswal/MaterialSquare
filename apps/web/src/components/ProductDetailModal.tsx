import { materialId } from "../ids";
import { useCustomer } from '../customer';
import { productMessage, whatsappLink } from '../messages';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useEffect, useState } from 'react';
import {
  X,
  Plus,
  Check,
  ShieldCheck,
  Truck,
  MessageCircle,
  FileText,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';
import { COMPANY_INFO } from '../data/materialsData';

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  inBOM,
  onToggleBOM,
}: { product: CatalogueProduct | null; isOpen: boolean; onClose: () => void; inBOM: boolean; onToggleBOM: (product: MaterialItem) => void }) {
  const { items, updateItems, ready, canEdit, error } = useCustomer();
  const [specification, setSpecification] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [added, setAdded] = useState(false);
  useEffect(() => { setSpecification(''); setQuantity('1'); setAdded(false); }, [product?.id]);
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
  const waProductUrl = whatsappLink(productMessage({...product, specification}));

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
              {specification && <span className="selected-size-badge">Requested: {specification}</span>}
              <img src={product.image} alt={product.name} />{product.image.includes('illustration') && <span className="product-image-note">Illustrative image · confirm selected size</span>}
              <div className="modal-brand-overlay">
                <div className="modal-brand-tag-with-logo">
                  <div className="modal-brand-mini-logo">
                    <BrandLogo id={brandMeta?.id} className="modal-logo-svg" />
                  </div>
                  <span className="brand-pill">{product.brand}</span>
                </div>
              </div>
            </div>

            <div className="modal-dispatch-box">
              <div className="dispatch-row">
                <Truck size={16} />
                <span><strong>Dispatch:</strong> {product.dispatchTime} across Delhi NCR</span>
              </div>
              <div className="dispatch-row">
                <ShieldCheck size={16} />
                <span><strong>Authenticity:</strong> 100% Genuine with Manufacturer GST Bill</span>
              </div>
            </div>

            <div className="modal-actions-stack">
              <a
                href={waProductUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-block"
              >
                <WhatsAppIcon size={18} color="#ffffff" />
                <span>Get Bulk Rate on WhatsApp</span>
              </a>

              <form className="customer-form product-options" onSubmit={event => {
                event.preventDefault();
                const value = Number(quantity);
                if (!ready || !Number.isFinite(value) || value <= 0 || value > 1000000) return;
                const selection = specification.trim();
                const accepted = updateItems(old => {
                  const existing = old.find(item => (item.catalogueId || item.id) === product.id && (item.specification || '') === selection);
                  const item = {...product, catalogueId: product.id, id: existing?.id || `${product.id}-${materialId()}`, specification: selection, quantity: value};
                  return existing ? old.map(row => row.id === existing.id ? item : row) : [...old, item];
                });
                setAdded(accepted);
              }}>
                <label>Required size / specification{product.specs?.sizes ? ' *' : ' (optional)'}
                  <input required={Boolean(product.specs?.sizes)} maxLength={500} value={specification} placeholder="Enter your required size or variant" onChange={e=>{setSpecification(e.target.value);setAdded(false);}}/>
                </label>
                <label>Quantity ({product.unit})
                  <input type="number" min="0.001" max="1000000" step="any" required value={quantity} onChange={e=>{setQuantity(e.target.value);setAdded(false);}}/>
                </label>
                <button disabled={!canEdit} className="btn btn-orange btn-block">{items.some(item => (item.catalogueId || item.id) === product.id && (item.specification || '') === specification.trim()) ? 'Update this size in Material List' : 'Add this selection to Material List'}</button>
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
                  <BrandLogo id={brandMeta?.id} className="modal-header-logo-svg" />
                </div>
                <div className="modal-brand-text-col">
                  <span className="modal-brand-official-tagline">{brandMeta?.tagline || product.brandTagline}</span>
                  <span className="modal-factory-direct-guarantee">
                    <ShieldCheck size={12} /> 100% Genuine Authorized Depot Supply
                  </span>
                </div>
              </div>

              <h2 id="modal-prod-title" className="modal-title">{product.name}</h2>
            </div>

            <div className="modal-rate-strip">
              <div>
                <span className="rate-k">Pricing:</span>
                <div className="rate-big mono">{'Request a quotation'}</div>
              </div>
              <span className="moq-pill">Min Order: {product.minOrderQty}</span>
            </div>

            {/* Technical Parameters Table */}
            <div className="modal-spec-table-wrap">
              <h4 className="spec-table-heading">Technical & Testing Parameters</h4>
              <div className="spec-table">
                {product.specs &&
                  Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="spec-table-row">
                      <span className="spec-name">{key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                      <span className="spec-value mono">{String(val)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Approved Site Applications */}
            <div className="modal-applications-box">
              <h4 className="spec-table-heading">Recommended Site Applications</h4>
              <div className="app-chips-row">
                {product.applications.map((app, i) => (
                  <span key={i} className="app-chip">
                    <CheckCircle2 size={13} /> {app}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Advantages */}
            <div className="modal-advantages-box">
              <h4 className="spec-table-heading">Performance Features</h4>
              <ul className="modal-features-ul">
                {product.features.map((feat, i) => (
                  <li key={i}>{feat}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
