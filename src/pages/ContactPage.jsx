import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Mail,
  Truck,
  ShieldCheck,
  Send,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { COMPANY_INFO } from '../data/materialsData';
import InstagramIcon from '../components/icons/InstagramIcon';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: 'Noida',
    projectType: 'residential-builder-floor',
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const serviceZones = [
    {
      zone: 'Noida & Greater Noida',
      coverage: 'Sector 1 to 168, Greater Noida West (Noida Ext), Pari Chowk, Knowledge Park',
      dispatchTime: '2 to 4 Hours (Express Slot Available)',
    },
    {
      zone: 'Gurugram & Sohna',
      coverage: 'Golf Course Extension, DLF Phase 1-5, Sohna Road, Dwarka Expressway, Manesar',
      dispatchTime: 'Morning 7:00 AM Slot or Same-Day',
    },
    {
      zone: 'Delhi (South & Central)',
      coverage: 'South Ext, Greater Kailash, Vasant Kunj, Okhla, Chanakyapuri, Model Town',
      dispatchTime: 'Same-Day Coordinated Offloading',
    },
    {
      zone: 'Ghaziabad & Indirapuram',
      coverage: 'Indirapuram, Vaishali, Raj Nagar Extension, Crossings Republik, Vasundhara',
      dispatchTime: 'Within 3 to 5 Hours',
    },
    {
      zone: 'Faridabad',
      coverage: 'Neharpar (Greater Faridabad), Sector 14-16, NIT, Industrial Area',
      dispatchTime: 'Next-Day or Scheduled Casting Slot',
    },
  ];

  return (
    <div className="contact-page">
      {/* Page Header */}
      <section className="page-hero-header">
        <div className="container">
          <div className="page-hero-content">
            <span className="badge-pill badge-orange-pill">Central Procurement Desk</span>
            <h1 className="page-title">Contact & Central Depots</h1>
            <p className="page-subtitle">
              Need urgent site delivery, a wholesale quotation, or a technical consultation for your project? Connect with our dedicated procurement coordinators.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards Grid */}
      <section className="contact-channels-section">
        <div className="container">
          <div className="contact-cards-grid">
            {/* Phone Card */}
            <div className="contact-info-card">
              <div className="info-card-icon phone">
                <Phone size={24} />
              </div>
              <h3>Order Hotline</h3>
              <p>Direct phone line for quick bulk inquiries, casting bookings, and site deliveries.</p>
              <a href={`tel:${COMPANY_INFO.phone}`} className="channel-link">
                {COMPANY_INFO.phoneDisplay}
              </a>
              <span className="channel-sub">Mon — Sat: 8:00 AM – 8:00 PM</span>
            </div>

            {/* WhatsApp Card */}
            <div className="contact-info-card highlighted">
              <div className="info-card-icon whatsapp">
                <WhatsAppIcon size={26} color="#16a34a" />
              </div>
              <h3>WhatsApp Desk</h3>
              <p>Instant rate checks, handwritten list photos, and real-time truck tracking.</p>
              <a
                href={COMPANY_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="channel-link"
              >
                Chat on WhatsApp
              </a>
              <span className="channel-sub">Average response under 10 mins</span>
            </div>

            {/* Instagram Card */}
            <div className="contact-info-card">
              <div className="info-card-icon insta">
                <InstagramIcon size={24} />
              </div>
              <h3>Instagram Official</h3>
              <p>Follow our daily site tips, storage rules, and Delhi NCR project deliveries.</p>
              <a
                href={COMPANY_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="channel-link"
              >
                {COMPANY_INFO.handle}
              </a>
              <span className="channel-sub">Join 10k+ Delhi NCR builders</span>
            </div>

            {/* Depot Card */}
            <div className="contact-info-card">
              <div className="info-card-icon depot">
                <MapPin size={24} />
              </div>
              <h3>Central Logistics Hub</h3>
              <p>Equipped with overhead cranes, sheltered cement docks, and dedicated fleet vehicles.</p>
              <span className="depot-address">{COMPANY_INFO.depotAddress}</span>
              <span className="channel-sub">Delhi NCR Expressway Corridor</span>
            </div>
          </div>
        </div>
      </section>

      {/* Coverage Areas & Delivery Timelines */}
      <section className="coverage-zones-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill">Fleet Logistics Infrastructure</span>
            <h2 className="section-title-clean">Delhi NCR Dedicated Service Coverage</h2>
            <p className="section-subtitle-clean">
              Our GPS-tracked fleet delivers directly past your site gate across the National Capital Region.
            </p>
          </div>

          <div className="zones-table-wrapper">
            <table className="zones-table">
              <thead>
                <tr>
                  <th>Region / Sector</th>
                  <th>Key Areas Covered</th>
                  <th>Standard Dispatch Window</th>
                </tr>
              </thead>
              <tbody>
                {serviceZones.map((z, idx) => (
                  <tr key={idx}>
                    <td className="zone-name-cell">
                      <Truck size={16} className="truck-icon" />
                      <strong>{z.zone}</strong>
                    </td>
                    <td>{z.coverage}</td>
                    <td>
                      <span className="timing-badge">
                        <Clock size={12} /> {z.dispatchTime}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="contact-form-section">
        <div className="container">
          <div className="contact-form-layout">
            <div className="form-info-col">
              <span className="badge-pill badge-orange-pill">Direct Procurement Inquiry</span>
              <h2>Schedule a Site Visit or Material Consultation</h2>
              <p>
                Have a new residential villa, apartment project, or commercial build starting in Delhi NCR? Request a site visit from our technical material coordinator to finalize BOQ specifications and bulk contractor pricing.
              </p>

              <div className="guarantees-list">
                <div className="guarantee-item">
                  <ShieldCheck size={18} className="g-icon" />
                  <div>
                    <strong>100% Original Manufacturer Billing</strong>
                    <p>Every bag of cement and bundle of steel is accompanied by genuine GST bills.</p>
                  </div>
                </div>

                <div className="guarantee-item">
                  <Clock size={18} className="g-icon" />
                  <div>
                    <strong>Slab Casting Priority Timing</strong>
                    <p>Schedule your early morning pours with guaranteed arrival before your mistri team starts.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-box-col">
              <div className="inquiry-form-card">
                {submitted ? (
                  <div className="inquiry-success">
                    <CheckCircle2 size={40} className="check-green" />
                    <h3>Thank You!</h3>
                    <p>Your inquiry has been logged. Our Delhi NCR coordinator will call you within 30 minutes.</p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="btn btn-secondary btn-sm"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="inquiry-form">
                    <h3>Direct Procurement Message</h3>

                    <div className="form-group">
                      <label>Your Full Name / Contractor Firm:</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikas Gupta / Gupta Constructions"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Mobile Number:</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 98110 XXXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Site Location (Delhi NCR):</label>
                      <select
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="form-select"
                      >
                        <option value="Noida">Noida</option>
                        <option value="Greater Noida">Greater Noida</option>
                        <option value="Greater Noida West">Greater Noida West</option>
                        <option value="Delhi">Delhi (South / Central / East)</option>
                        <option value="Gurugram">Gurugram</option>
                        <option value="Ghaziabad">Ghaziabad</option>
                        <option value="Faridabad">Faridabad</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Project Type:</label>
                      <select
                        value={formData.projectType}
                        onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                        className="form-select"
                      >
                        <option value="residential-builder-floor">Independent Builder Floor (G+3 / G+4)</option>
                        <option value="luxury-villa">Luxury Villa / Farmhouse</option>
                        <option value="commercial">Commercial / Institutional Building</option>
                        <option value="renovation">Renovation & Interior Fitout</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Materials or Quantities Needed:</label>
                      <textarea
                        rows="3"
                        placeholder="e.g. Need 400 bags UltraTech Super and 5 MT 12mm TMT steel next Tuesday..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="form-textarea"
                      ></textarea>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block btn-lg">
                      <Send size={16} />
                      <span>Send Procurement Inquiry</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
