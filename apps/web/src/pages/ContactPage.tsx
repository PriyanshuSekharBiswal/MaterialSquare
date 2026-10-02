import RequestContactForm from '../components/RequestContactForm';
import { whatsappLink } from '../messages';
import { submitRequest } from '../api';
import React, { useState } from 'react';
import {
  Phone,
  MapPin,
  Clock,
  Truck,
  ShieldCheck,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { COMPANY_INFO } from '../data/materialsData';
import InstagramIcon from '../components/icons/InstagramIcon';
import WhatsAppIcon from '../components/icons/WhatsAppIcon';
import DirectionGoogleMaps from '../components/DirectionGoogleMaps';

export default function ContactPage() {
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
            <span className="badge-pill badge-orange-pill reveal-text">Central Procurement Desk</span>
            <h1 className="page-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Contact & Central Depots</span>
              </span>
            </h1>
            <p className="page-subtitle reveal-text">
              Need urgent site delivery, a wholesale quotation, or a technical consultation for your project? Connect with our dedicated procurement coordinators.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards Grid */}
      <section className="contact-channels-section">
        <div className="container">
          <div className="contact-cards-grid reveal-stagger">
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
                href={whatsappLink('Material Square — Contact Enquiry\n\nHello, I would like to speak with your team about my project.')}
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
            <div className="contact-info-card highlighted">
              <div className="info-card-icon depot">
                <MapPin size={24} />
              </div>
              <h3>Central Office & Logistics Hub</h3>
              <p>Equipped with overhead cranes, sheltered cement docks, and dedicated fleet vehicles.</p>
              <span className="depot-address">{COMPANY_INFO.officeAddress}</span>
              <a
                href={COMPANY_INFO.officeGoogleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="channel-link"
              >
                Open Office in Google Maps ↗
              </a>
              <span className="channel-sub">Ghaziabad HQ · Dedicated fleet to all 6 NCR zones</span>
            </div>
          </div>
        </div>
      </section>

      {/* Google Maps Directions to Ghaziabad Office with Ola/Uber Animated Trucks */}
      <DirectionGoogleMaps />

      {/* Coverage Areas & Delivery Timelines */}
      <section className="coverage-zones-section">
        <div className="container">
          <div className="section-title-wrap text-center">
            <span className="badge-pill reveal-text">Fleet Logistics Infrastructure</span>
            <h2 className="section-title-clean reveal-title">
              <span className="ms-mask-line">
                <span className="ms-mask-text">Delhi NCR Dedicated</span>
              </span>{' '}
              <span className="ms-mask-line">
                <span className="ms-mask-text delay-1">Service Coverage</span>
              </span>
            </h2>
            <p className="section-subtitle-clean reveal-text">
              Our GPS-tracked fleet delivers directly past your site gate across the National Capital Region.
            </p>
          </div>

          <div className="zones-table-wrapper reveal-card">
            <table className="zones-table">
              <thead>
                <tr>
                  <th>Region / Sector</th>
                  <th>Key Areas Covered</th>
                  <th className="th-desktop-timing">Standard Dispatch Window</th>
                </tr>
              </thead>
              <tbody>
                {serviceZones.map((z, idx) => (
                  <tr key={idx} className="zone-row">
                    <td className="zone-name-cell">
                      <div className="zone-name-header">
                        <Truck size={16} className="truck-icon" />
                        <strong className="zone-title">{z.zone}</strong>
                      </div>
                      <div className="zone-mobile-timing">
                        <span className="timing-badge">
                          <Clock size={12} /> {z.dispatchTime}
                        </span>
                      </div>
                    </td>
                    <td className="zone-coverage-cell">
                      <span className="coverage-label-mobile">Areas Covered: </span>
                      {z.coverage}
                    </td>
                    <td className="zone-timing-cell desktop-only">
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
              <span className="badge-pill badge-orange-pill reveal-text">Direct Procurement Inquiry</span>
              <h2 className="reveal-title">
                <span className="ms-mask-line">
                  <span className="ms-mask-text">Schedule a Site Visit</span>
                </span>{' '}
                <span className="ms-mask-line">
                  <span className="ms-mask-text delay-1">or Material Consultation</span>
                </span>
              </h2>
              <p className="reveal-text">
                Have a new residential villa, apartment project, or commercial build starting in Delhi NCR? Request a site visit from our technical material coordinator to finalize BOQ specifications and bulk contractor pricing.
              </p>

              <div className="guarantees-list reveal-stagger">
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
              <div className="inquiry-form-card reveal-card">
                <RequestContactForm enquiry />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
