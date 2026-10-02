import { productMessage, whatsappLink } from '../messages';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';
import { PRODUCTS } from '../data/materialsData';

export default function FeaturedMaterialsCarousel({ onToggleBOM, bomList = [] }: { onToggleBOM: (product: MaterialItem) => void; bomList?: MaterialItem[] }) {
  // Select top 8 flagship materials across all trades
  const featured = [
    PRODUCTS[0], // UltraTech Super Weather Plus
    PRODUCTS[4], // Astral CPVC Pro
    PRODUCTS[7], // Polycab Green Wire FR-LSH
    PRODUCTS[8], // Tata Tiscon 550D TMT
    PRODUCTS[5], // Supreme SWR Drainage
    PRODUCTS[9], // Asian Paints Apex Ultima
    PRODUCTS[1], // Ambuja Kawach Cement
    PRODUCTS[11], // Jaquar Florentine Diverter
  ];

  const [startIndex, setStartIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(4);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef(null);

  // Responsive items count
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(1);
      } else if (width < 960) {
        setItemsPerView(2);
      } else if (width < 1200) {
        setItemsPerView(3);
      } else {
        setItemsPerView(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxStartIndex = Math.max(0, featured.length - itemsPerView);

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setStartIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused, maxStartIndex]);

  const handlePrev = () => {
    setStartIndex((prev) => (prev <= 0 ? maxStartIndex : prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => (prev >= maxStartIndex ? 0 : prev + 1));
  };

  const isItemInBOM = (id: string) => bomList.some((item) => item.id === id);

  return (
    <section
      className="featured-materials-carousel-section"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Trending Site Materials Carousel"
    >
      <div className="container">
        {/* Header with Title & Controls */}
        <div className="carousel-section-header">
          <div>
            <div className="eyebrow-pill-row">
              <span className="badge-pill badge-orange-pill">
                <Sparkles size={13} /> Trending Site Materials
              </span>
              <span className="dispatch-badge">Daily Delhi NCR Dispatches</span>
            </div>
            <h2 className="section-title-clean">Wholesale Best-Sellers for Immediate Dispatch</h2>
            <p className="section-subtitle-clean">
              Most requested materials by Delhi NCR contractors this week with factory test certificates.
            </p>
          </div>

          <div className="carousel-nav-arrows">
            <button
              type="button"
              className="carousel-btn-circle"
              onClick={handlePrev}
              aria-label="Previous Materials"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="carousel-btn-circle"
              onClick={handleNext}
              aria-label="Next Materials"
            >
              <ChevronRight size={20} />
            </button>
            <Link to="/marketplace" className="btn btn-secondary btn-sm browse-all-btn">
              <span>View All 18 Items</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Carousel Slider Window */}
        <div className="multi-carousel-window" ref={containerRef}>
          <div
            className="multi-carousel-track"
            style={{
              transform: `translateX(-${(startIndex * 100) / itemsPerView}%)`,
              width: `${(featured.length * 100) / itemsPerView}%`,
            }}
          >
            {featured.map((product) => {
              const inBOM = isItemInBOM(product.id);
              const brandMeta = getBrandMeta(product.brand);
              return (
                <div
                  key={product.id}
                  className="multi-carousel-item"
                  style={{ width: `${100 / featured.length}%` }}
                >
                  <div className="trending-product-card">
                    <div className="trending-media-box">
                      <img src={product.image} alt={product.name} loading="lazy" />{product.image.includes('illustration') && <span className="product-image-note">Illustrative image · confirm selected size</span>}
                      <div className="trending-brand-chip-with-logo">
                        <div className="trending-brand-logo-frame">
                          <BrandLogo id={brandMeta?.id} className="trending-mini-logo-svg" />
                        </div>
                        <span className="trending-brand-name">{product.brand}</span>
                      </div>
                      <span className="trending-cat-tag">{product.categoryLabel}</span>
                    </div>

                    <div className="trending-card-body">
                      <span className="trending-sku-code font-mono">{product.code}</span>
                      <h3 className="trending-prod-title">{product.name}</h3>

                      <div className="trending-spec-row">
                        <span className="spec-unit">{product.unit}</span>
                        {product.specs?.standard && (
                          <span className="spec-std font-mono">{product.specs.standard}</span>
                        )}
                      </div>

                      <div className="trending-rate-row">
                        <span className="rate-text">{'Request a quotation'}</span>
                        <span className="gst-bill-tag">
                          <ShieldCheck size={11} /> GST Bill
                        </span>
                      </div>

                      <div className="trending-actions-row">
                        <button
                          type="button"
                          className={`btn-trending-bom ${inBOM ? 'added' : ''}`}
                          onClick={() => onToggleBOM(product)}
                        >
                          {inBOM ? (
                            <>
                              <Check size={14} /> In List
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Add to List
                            </>
                          )}
                        </button>

                        <a
                          href={whatsappLink(productMessage(product))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-trending-wa"
                          title="Quote on WhatsApp"
                        >
                          <WhatsAppIcon size={16} color="currentColor" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Pagination Progress Indicator */}
        <div className="carousel-progress-dots">
          {Array.from({ length: maxStartIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`progress-dot-btn ${idx === startIndex ? 'active' : ''}`}
              onClick={() => setStartIndex(idx)}
              aria-label={`Jump to slide position ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
