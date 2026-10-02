import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState } from 'react';
import { ShieldCheck, Check, Sparkles } from 'lucide-react';
import { BRAND_LIST, BrandLogo } from './icons/BrandBadges';

export default function BrandRoster({ onSelectBrand, selectedBrand }: { onSelectBrand: (brand: string) => void; selectedBrand: string }) {
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = ['All', 'Cement', 'Pipes', 'Wires', 'Paints', 'Sanitary', 'Steel', 'Adhesives'];

  const filteredBrands = filterCategory === 'All'
    ? BRAND_LIST
    : BRAND_LIST.filter((b) => b.category === filterCategory);

  return (
    <section id="brands" className="ms-brand-roster-section">
      <div className="container">
        {/* Section Header */}
        <div className="brand-roster-header">
          <div className="roster-header-text">
            <span className="badge-orange reveal-text">100% Genuine Manufacturer Partners</span>
            <h2 className="section-title reveal-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Trusted Brands.</span>
              </span>{' '}
              <span className="ms-mask-line">
                <span className="ms-mask-text delay-1">One Destination.</span>
              </span>
            </h2>
            <p className="section-subtitle reveal-text">
              Zero counterfeit risk. Material Square delivers directly from authorized factory depots with manufacturer GST invoices and batch test certificates.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="roster-filter-pills reveal-text">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`roster-pill ${filterCategory === cat ? 'active' : ''}`}
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Cards Grid */}
        <div className="brand-cards-grid reveal-stagger">
          {filteredBrands.map((brand) => {
            const isSelected = selectedBrand === brand.name;
            return (
              <div
                key={brand.id}
                className={`brand-partner-card ${isSelected ? 'selected-brand' : ''}`}
                onClick={() => onSelectBrand(brand.name === selectedBrand ? '' : brand.name)}
                role="button"
                tabIndex={0}
                title={`Filter products by ${brand.name}`}
              >
                <div className="brand-card-top">
                  <span className="brand-category-badge">{brand.category}</span>
                  <span className="authorized-badge">
                    <ShieldCheck size={13} /> Authorized
                  </span>
                </div>

                <div className="brand-logo-frame">
                  <BrandLogo id={brand.id} className="brand-logo-svg" />
                </div>

                <div className="brand-info-plate">
                  <p className="brand-tagline-text">{brand.tagline}</p>
                </div>

                <div className="brand-card-footer">
                  <span className="click-to-filter">
                    {isSelected ? '✓ Showing Products' : 'Click to View Products →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
