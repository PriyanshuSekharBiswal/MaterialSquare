import type { MaterialItem, CatalogueProduct } from '../types';
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Truck,
  ShieldCheck,
  Clock,
  Layers,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Building,
} from 'lucide-react';
import { COMPANY_INFO, CONSTRUCTION_BINGO, SITE_DELAY_REASONS } from '../data/materialsData';
import { BRAND_LIST, BrandLogo } from '../components/icons/BrandBadges';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';

export default function WhyUsPage({ onOpenBOMDrawer }: { onOpenBOMDrawer: () => void }) {
  const comparisonItems = [
    {
      aspect: 'Procurement Process',
      traditional: 'Chasing 5 to 7 separate vendors across different markets (Cement dealer, Saria shop, Sanitary showroom, Electrical counter).',
      materialSquare: 'One single call or WhatsApp message to Material Square. Your entire site list quoted and fulfilled together.',
    },
    {
      aspect: 'Freight & Delivery Logistics',
      traditional: 'Paying separate cartage / freight for 5 different tempo trips arriving randomly throughout the week.',
      materialSquare: 'Consolidated site delivery on our dedicated fleet. Materials arrive organized by your exact casting schedule.',
    },
    {
      aspect: 'Site Labor Productivity',
      traditional: 'Labour sits idle for 3-5 hours because cement arrived at 9 AM but the required TMT rebars or binding wire got delayed.',
      materialSquare: 'All matching materials arrive together. Zero idle labor time or wasted daily contractor wages.',
    },
    {
      aspect: 'Fittings & Compatibility',
      traditional: 'Local dealers mix cheap unbranded CPVC elbows or solvent with branded Astral/Supreme pipes, leading to leaks behind tiled walls.',
      materialSquare: '100% matched manufacturer systems. Astral with Astral, Supreme with Supreme, accompanied by certified adhesives.',
    },
    {
      aspect: 'Billing & GST Reconciliation',
      traditional: 'Collecting mismatched kacha slips, paper bills with wrong GSTINs, and dealing with tax reconciliation nightmares.',
      materialSquare: 'One single clean, consolidated B2B GST tax invoice direct from authorized manufacturer distribution channels.',
    },
    {
      aspect: 'Quality & Test Certificates',
      traditional: 'High risk of duplicate cement, rerolled rebar, or spurious cables sold through unauthorized local godowns.',
      materialSquare: '100% genuine factory-sealed stock with original batch test certificates (IS 1489, IS 1786 Fe 550D, IS 694).',
    },
  ];

  return (
    <div className="why-us-page">
      {/* Hero Header */}
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill reveal-text">The Material Square Advantage</span>
            <h1 className="page-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Why Make 5 Calls?</span>
              </span>{' '}
              <span className="ms-mask-line">
                <span className="ms-mask-text accent-text delay-2">One Call. All Materials.</span>
              </span>
            </h1>
            <p className="page-hindi-highlight reveal-text">"{COMPANY_INFO.sloganHindi}"</p>
            <p className="page-subtitle reveal-text">
              Building a house, commercial structure, or villa in Delhi NCR shouldn’t mean wasting your days coordinating 5 different suppliers.
              Material Square consolidates procurement, logistics, and billing into one seamless workflow.
            </p>

            <div className="page-hero-actions">
              <Link to="/marketplace" className="btn btn-primary btn-lg">
                <span>Browse Certified Materials</span>
                <ArrowRight size={16} />
              </Link>
              <a
                href={COMPANY_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg"
              >
                <WhatsAppIcon size={20} color="#ffffff" />
                <span>Procurement Desk: {COMPANY_INFO.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section: 5 Calls vs 1 Call */}
      <section className="comparison-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill">The Procurement Comparison</span>
            <h2 className="section-title-clean reveal-title">Traditional 5-Vendor Hustle vs Material Square</h2>
            <p className="section-subtitle-clean reveal-text">
              See the direct financial and operational difference when you consolidate your site orders.
            </p>
          </div>

          <div className="comparison-table-wrapper reveal-card">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th className="th-aspect">Workflow Aspect</th>
                  <th className="th-traditional">Traditional Way (5+ Vendors)</th>
                  <th className="th-ms">Material Square (Consolidated)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="td-aspect">
                      <strong>{item.aspect}</strong>
                    </td>
                    <td className="td-traditional">
                      <div className="comparison-cell-content">
                        <XCircle size={18} className="cell-icon red" />
                        <span>{item.traditional}</span>
                      </div>
                    </td>
                    <td className="td-ms">
                      <div className="comparison-cell-content">
                        <CheckCircle2 size={18} className="cell-icon green" />
                        <span>{item.materialSquare}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Construction Site Delays / Bingo Solved */}
      <section className="site-bingo-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill badge-orange-pill reveal-text">Real Site Nightmares Solved</span>
            <h2 className="section-title-clean reveal-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Construction Bingo:</span>
              </span>{' '}
              <span className="ms-mask-line">
                <span className="ms-mask-text delay-1">6 Common Site Headaches We Eliminate</span>
              </span>
            </h2>
            <p className="section-subtitle-clean reveal-text">
              Contractors, architects, and site supervisors in Delhi NCR lose up to 14 days per project to preventable supply disruptions. Here is how we fix them.
            </p>
          </div>

          <div className="bingo-cards-grid reveal-stagger">
            {CONSTRUCTION_BINGO.map((item, idx) => (
              <div key={item.id} className="bingo-card">
                <div className="bingo-card-header">
                  <span className="bingo-number">0{idx + 1}</span>
                  <div className="bingo-titles">
                    <h3 className="bingo-title">{item.title}</h3>
                    <span className="bingo-hindi">"{item.hindiSub}"</span>
                  </div>
                </div>

                <div className="bingo-pain-box">
                  <div className="pain-label">
                    <AlertTriangle size={14} /> The Problem On Site:
                  </div>
                  <p>{item.pain}</p>
                </div>

                <div className="bingo-solution-box">
                  <div className="solution-label">
                    <CheckCircle2 size={14} /> The Material Square Fix:
                  </div>
                  <p>{item.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Delhi NCR Dedicated Logistics Fleet */}
      <section className="logistics-fleet-section">
        <div className="container">
          <div className="fleet-grid-split">
            <div className="fleet-info-col">
              <span className="badge-pill reveal-text">Site Logistics Infrastructure</span>
              <h2 className="section-title-clean reveal-title">
                <span className="ms-mask-line">
                  <span className="ms-mask-text">Consolidated Fleet Coverage</span>
                </span>{' '}
                <span className="ms-mask-line">
                  <span className="ms-mask-text delay-1">Across Delhi NCR</span>
                </span>
              </h2>
              <p className="fleet-desc reveal-text">
                From tight residential colonies in South Delhi and Noida sectors to sprawling villa sites in Greater Noida and Gurugram, our specialized logistics fleet delivers materials directly past your site gate.
              </p>

              <div className="fleet-features-list reveal-stagger">
                <div className="fleet-feat-item">
                  <div className="feat-icon-circle">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h4>Direct Multi-Category Loading</h4>
                    <p>Pipes, cement, saria bundles, and wire coils loaded systematically so nothing is crushed or damaged during transport.</p>
                  </div>
                </div>

                <div className="fleet-feat-item">
                  <div className="feat-icon-circle">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4>Coordinated Slab Casting Dispatch</h4>
                    <p>Schedule your concrete or rebar delivery for 7:00 AM before labor arrives, ensuring continuous pouring without stops.</p>
                  </div>
                </div>

                <div className="fleet-feat-item">
                  <div className="feat-icon-circle">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4>Driver Verification & Site Gate Check</h4>
                    <p>Every dispatch includes a verified physical gate pass, item count check, and test certificates signed off before offloading.</p>
                  </div>
                </div>
              </div>

              {/* Service Areas Pills */}
              <div className="service-zones-box reveal-card">
                <span className="zones-heading">
                  <MapPin size={15} /> Active Service Zones:
                </span>
                <div className="zones-pills">
                  <span className="zone-pill">Noida (All Sectors)</span>
                  <span className="zone-pill">Greater Noida & West</span>
                  <span className="zone-pill">South & Central Delhi</span>
                  <span className="zone-pill">Gurugram (Sohna & Dwarka Exp)</span>
                  <span className="zone-pill">Ghaziabad & Indirapuram</span>
                  <span className="zone-pill">Faridabad</span>
                </div>
              </div>
            </div>

            <div className="fleet-media-col">
              <div className="fleet-visual-card reveal-card">
                <img
                  src="https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=900&q=80"
                  alt="Material Square Construction Fleet"
                />
                <div className="fleet-stat-badge">
                  <span className="stat-big">100%</span>
                  <span className="stat-lbl">On-Time Site Slot Guarantee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 16 Authorized Brands */}
      <section className="authorized-brands-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill reveal-text">Direct Manufacturer Relationships</span>
            <h2 className="section-title-clean reveal-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">16 Authorized Brand Partners</span>
              </span>
            </h2>
            <p className="section-subtitle-clean reveal-text">
              Zero middlemen. Direct authorized channel pricing from India's most trusted building product giants.
            </p>
          </div>

          <div className="brands-full-grid reveal-stagger">
            {BRAND_LIST.map((b) => (
              <Link
                key={b.id}
                to={`/marketplace?brand=${encodeURIComponent(b.name)}`}
                className="brand-card-detailed"
                title={`Browse ${b.name} Products`}
              >
                <div className="brand-card-logo-frame">
                  <BrandLogo id={b.id} className="brand-logo-svg" />
                </div>
                <div className="brand-card-body">
                  <div className="brand-card-header-row">
                    <span className="brand-tagline-text">{b.tagline}</span>
                    <span className="brand-category-pill">{b.category}</span>
                  </div>
                  <span className="brand-link-text">
                    <span>View catalog materials</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="why-bottom-cta">
        <div className="container cta-box-gradient reveal-card">
          <div className="cta-left">
            <h2 className="reveal-title">Ready to Simplify Your Next Construction Milestone?</h2>
            <p className="reveal-text">"{COMPANY_INFO.sloganHindi}"</p>
          </div>
          <div className="cta-actions">
            <Link to="/get-quote" className="btn btn-primary btn-lg">
              Get a Free Quote
            </Link>
            <a
              href={`tel:${COMPANY_INFO.phone}`}
              className="btn btn-secondary btn-lg"
            >
              <Phone size={16} /> Call {COMPANY_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
