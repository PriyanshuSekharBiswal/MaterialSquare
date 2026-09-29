import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, Mail, ArrowUp, ShieldCheck } from 'lucide-react';
import MaterialSquareLogo from './icons/MaterialSquareLogo';
import InstagramIcon from './icons/InstagramIcon';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { COMPANY_INFO } from '../data/materialsData';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="ms-footer-section">
      <div className="container">
        {/* Top Highlight Banner */}
        <div className="footer-callout-banner">
          <div className="callout-left">
            <span className="badge-dark">Delhi NCR Construction Partner</span>
            <h3>Ready to Order or Have a Material Query?</h3>
            <p>"Why make 5 calls? Send your handwritten list or structural drawings to our procurement desk."</p>
          </div>

          <div className="callout-right-actions">
            <a
              href={`tel:${COMPANY_INFO.phone}`}
              className="btn btn-outline"
            >
              <Phone size={16} />
              <span>Call {COMPANY_INFO.phoneDisplay}</span>
            </a>

            <a
              href={COMPANY_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <WhatsAppIcon size={18} color="#ffffff" />
              <span>WhatsApp Us Now</span>
            </a>
          </div>
        </div>

        {/* 4 Columns Grid */}
        <div className="footer-columns-grid">
          {/* Brand Col */}
          <div className="footer-col brand-col">
            <MaterialSquareLogo size={46} showText={true} lightMode={true} />
            <p className="footer-tagline-para">
              "{COMPANY_INFO.sloganHindi}"
            </p>
            <p className="footer-bio-para">
              Material Square is your direct-to-site construction marketplace in Delhi NCR.
              We supply authorized cement, TMT steel, pipes, wires, paints, and sanitaryware from 16 leading manufacturers.
            </p>

            <a
              href={COMPANY_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-instagram-link"
            >
              <InstagramIcon size={16} />
              <span>Follow {COMPANY_INFO.handle} on Instagram</span>
            </a>
          </div>

          {/* Quick Categories Col */}
          <div className="footer-col">
            <h4 className="footer-heading">Materials Supplied</h4>
            <ul className="footer-nav-list">
              <li><Link to="/marketplace?category=cement">Cement (UltraTech, Ambuja, JK)</Link></li>
              <li><Link to="/marketplace?category=wires">TMT Steel (Tata Tiscon, JSW)</Link></li>
              <li><Link to="/marketplace?category=pipes">Pipes & Fittings (Astral, Supreme)</Link></li>
              <li><Link to="/marketplace?category=wires">Wires & Cables (Polycab, Havells)</Link></li>
              <li><Link to="/marketplace?category=paints">Paints (Asian Paints, Birla Opus)</Link></li>
              <li><Link to="/marketplace?category=sanitary">Sanitaryware (Jaquar, CERA)</Link></li>
            </ul>
          </div>

          {/* Dedicated Pages Navigation */}
          <div className="footer-col">
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-nav-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/marketplace">Marketplace</Link></li>
              <li><Link to="/why-us">Why Us</Link></li>
              <li><Link to="/guides">Tools & Guides</Link></li>
              <li><Link to="/get-quote">Get Quote</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          {/* Depot & Service Areas Col */}
          <div className="footer-col">
            <h4 className="footer-heading">Service Hub & Logistics</h4>
            <div className="footer-info-item">
              <MapPin size={16} className="f-icon" />
              <span>{COMPANY_INFO.location}</span>
            </div>
            <div className="footer-info-item">
              <Phone size={16} className="f-icon" />
              <span>{COMPANY_INFO.phoneDisplay}</span>
            </div>
            <div className="footer-info-item">
              <Mail size={16} className="f-icon" />
              <span>{COMPANY_INFO.email}</span>
            </div>

            <div className="footer-assurance-box">
              <ShieldCheck size={16} />
              <span>100% Genuine Materials with Manufacturer GST Bill</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-row">
          <p className="copyright-text">
            © {new Date().getFullYear()} Material Square. All rights reserved. Building Better Together.
          </p>

          <button
            type="button"
            className="scroll-to-top-btn"
            onClick={scrollToTop}
            aria-label="Scroll back to top"
          >
            <span>Back to Top</span>
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
