import React, { useEffect } from 'react';
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
}) {
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

    const handleKeyDown = (e) => {
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
  const waProductUrl = `https://wa.me/919773505015?text=Hello%20Material%20Square,%20I%20am%20inquiring%20about:%20${encodeURIComponent(product.name)}%20(${product.code})%20from%20${encodeURIComponent(product.brand)}.%20Please%20share%20bulk%20pricing%20and%20delivery%20schedule.`;

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
              <img src={product.image} alt={product.name} />
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

              <button
                type="button"
                className={`btn btn-block ${inBOM ? 'btn-in-bom' : 'btn-orange'}`}
                onClick={() => onToggleBOM(product)}
              >
                {inBOM ? <Check size={16} /> : <Plus size={16} />}
                <span>{inBOM ? 'Added to Material List' : 'Add to Material List'}</span>
              </button>
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
                <span className="rate-k">Estimated Wholesale Rate:</span>
                <div className="rate-big mono">{product.wholesaleRate}</div>
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
                      <span className="spec-value mono">{val}</span>
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
