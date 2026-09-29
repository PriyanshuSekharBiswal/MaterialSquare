import React, { useState } from 'react';
import {
  PhoneCall,
  CheckCircle2,
  XCircle,
  Truck,
  Clock,
  Layers,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { COMPANY_INFO } from '../data/materialsData';

export default function FiveCallsVsOneCall({ onOpenBOM }) {
  const [activeTab, setActiveTab] = useState('comparison');

  const traditionalFive = [
    { title: 'Cement Supplier', icon: '🧱', desc: 'Call dealer 1 for UltraTech/Ambuja rate & bag dispatch' },
    { title: 'Wire Supplier', icon: '⚡', desc: 'Call electrical shop 2 for Polycab/Havells coils & gauges' },
    { title: 'Pipe Supplier', icon: '🚰', desc: 'Call plumbing depot 3 for Astral/Supreme CPVC lengths & fittings' },
    { title: 'Paint Supplier', icon: '🎨', desc: 'Call colour hub 4 for Asian Paints buckets, primer & putty' },
    { title: 'Sanitary Supplier', icon: '🚿', desc: 'Call bath showroom 5 for Jaquar/Cera commodes & faucets' },
  ];

  return (
    <section id="five-calls" className="ms-five-calls-section">
      <div className="container">
        {/* Section Header */}
        <div className="five-calls-header">
          <span className="badge-orange">The Construction Reality</span>
          <h2 className="section-title">Why Make 5 Calls? One Call. All Materials.</h2>
          <p className="section-subtitle">
            *"Itna kyu bhagna? Sab alag alag jagah."* Traditional procurement wastes 15-20 hours a week
            chasing scattered local dealers. Material Square solves this with one consolidated supply chain.
          </p>
        </div>

        {/* The VS Comparison Interactive Board */}
        <div className="five-vs-one-grid">
          {/* 5 Traditional Suppliers Side */}
          <div className="comparison-side traditional-side">
            <div className="side-header">
              <span className="side-badge bad-badge">Traditional Way</span>
              <h3 className="side-title">5 Disconnected Suppliers</h3>
              <p className="side-sub">Search. Wait. Struggle. Multiple invoices & shipping fees.</p>
            </div>

            <div className="supplier-rows-list">
              {traditionalFive.map((sup, index) => (
                <div key={index} className="supplier-row-item">
                  <div className="sup-icon-box">{sup.icon}</div>
                  <div className="sup-info">
                    <h4 className="sup-title">{sup.title}</h4>
                    <p className="sup-desc">{sup.desc}</p>
                  </div>
                  <div className="sup-call-tag">
                    <PhoneCall size={14} /> Call #{index + 1}
                  </div>
                </div>
              ))}
            </div>

            <div className="pain-points-summary">
              <div className="pain-point-item">
                <XCircle size={16} className="bad-icon" />
                <span>5 separate delivery trucks & multiple freight charges</span>
              </div>
              <div className="pain-point-item">
                <XCircle size={16} className="bad-icon" />
                <span>Laborers sitting idle when cement arrives 4 hours late</span>
              </div>
              <div className="pain-point-item">
                <XCircle size={16} className="bad-icon" />
                <span>Risk of local dealers mixing counterfeit or local rerolled stock</span>
              </div>
            </div>
          </div>

          {/* Center VS Element */}
          <div className="vs-divider-badge">
            <span className="vs-text">VS</span>
          </div>

          {/* 1 Call Material Square Side */}
          <div className="comparison-side ms-solution-side">
            <div className="side-header">
              <span className="side-badge good-badge">Material Square Advantage</span>
              <h3 className="side-title">1 Call: Material Square</h3>
              <p className="side-sub">Find. Choose. Build. Single order, single consolidated fleet dispatch.</p>
            </div>

            <div className="ms-hero-phone-card">
              <div className="phone-screen-inner">
                <div className="phone-status-strip">
                  <span className="phone-dot green-dot"></span>
                  <span>Direct Site Hotline Connected</span>
                </div>

                <div className="phone-hotline-show">
                  <PhoneCall size={28} className="phone-ring-icon" />
                  <span className="phone-digits">{COMPANY_INFO.phoneDisplay}</span>
                  <span className="phone-sub-text">"Aap Construction Sambhaliye, Material, Hum."</span>
                </div>

                <div className="consolidated-order-box">
                  <div className="consolidated-header">
                    <Truck size={18} />
                    <span>Consolidated Job-Site Dispatch</span>
                  </div>
                  <div className="consolidated-items-chips">
                    <span className="c-chip">✓ UltraTech Cement</span>
                    <span className="c-chip">✓ Polycab Wires</span>
                    <span className="c-chip">✓ Astral CPVC Pipes</span>
                    <span className="c-chip">✓ Asian Paints</span>
                    <span className="c-chip">✓ Jaquar & Cera Bath</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="solution-points-summary">
              <div className="solution-point-item">
                <CheckCircle2 size={16} className="good-icon" />
                <span><strong>1 Consolidated Truck:</strong> Everything arrives together on your scheduled time.</span>
              </div>
              <div className="solution-point-item">
                <CheckCircle2 size={16} className="good-icon" />
                <span><strong>Wholesale Transparency:</strong> Volume builder rates without retail markups.</span>
              </div>
              <div className="solution-point-item">
                <CheckCircle2 size={16} className="good-icon" />
                <span><strong>100% Genuine Warranty:</strong> Direct manufacturer batch test certificates.</span>
              </div>
            </div>

            <div className="ms-side-action">
              <button
                type="button"
                className="btn btn-orange btn-block"
                onClick={onOpenBOM}
              >
                <span>Upload Material List / Get 1 Consolidated Quote</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
