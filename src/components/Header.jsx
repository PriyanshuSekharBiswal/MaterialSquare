import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Phone, FileText, Menu, X, MapPin } from 'lucide-react';
import MaterialSquareLogo from './icons/MaterialSquareLogo';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { COMPANY_INFO } from '../data/materialsData';

export default function Header({ bomCount, onOpenBOMDrawer }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="ms-site-header">
      {/* Top Location & Direct Dispatch Bar */}
      <div className="ms-top-bar">
        <div className="container top-bar-content">
          <div className="top-bar-left">
            <span className="location-tag">
              <MapPin size={13} className="loc-icon" />
              <strong>Serving Delhi NCR:</strong> Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad
            </span>
          </div>

          <div className="top-bar-right">
            <span className="slogan-hindi">"{COMPANY_INFO.sloganHindi}"</span>
            <a href={`tel:${COMPANY_INFO.phone}`} className="hotline-phone">
              <Phone size={12} /> {COMPANY_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="ms-nav-main">
        <div className="container nav-content">
          {/* Logo */}
          <Link to="/" className="nav-logo" onClick={closeMenu}>
            <MaterialSquareLogo size={42} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav-links">
            <NavLink
              to="/"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/marketplace"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Marketplace
            </NavLink>
            <NavLink
              to="/why-us"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Why Us
            </NavLink>
            <NavLink
              to="/guides"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Tools & Guides
            </NavLink>
            <NavLink
              to="/get-quote"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Get Quote
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Contact
            </NavLink>
          </nav>

          {/* Action CTAs */}
          <div className="nav-action-buttons">
            <a
              href={COMPANY_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-sm nav-wa-btn"
              title="Chat with Material Square on WhatsApp"
            >
              <WhatsAppIcon size={16} color="#ffffff" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              className={`btn btn-secondary btn-sm nav-bom-trigger ${bomCount > 0 ? 'has-items' : ''}`}
              onClick={onOpenBOMDrawer}
            >
              <FileText size={15} />
              <span>Material List</span>
              {bomCount > 0 && <span className="bom-counter">{bomCount}</span>}
            </button>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-menu-pane">
          <div className="container mobile-links-list">
            <NavLink to="/" onClick={closeMenu} className="mobile-nav-item">
              Home
            </NavLink>
            <NavLink to="/marketplace" onClick={closeMenu} className="mobile-nav-item">
              Marketplace
            </NavLink>
            <NavLink to="/why-us" onClick={closeMenu} className="mobile-nav-item">
              Why Us (5 Calls vs 1 Call)
            </NavLink>
            <NavLink to="/guides" onClick={closeMenu} className="mobile-nav-item">
              Tools & Guides (Wire & Plumbing)
            </NavLink>
            <NavLink to="/get-quote" onClick={closeMenu} className="mobile-nav-item">
              Get Quote
            </NavLink>
            <NavLink to="/contact" onClick={closeMenu} className="mobile-nav-item">
              Contact & Depot
            </NavLink>

            <div className="mobile-actions-stack">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  closeMenu();
                  onOpenBOMDrawer();
                }}
              >
                <FileText size={16} />
                <span>View Material List ({bomCount})</span>
              </button>
              <a
                href={COMPANY_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-block"
              >
                <WhatsAppIcon size={18} color="#ffffff" />
                <span>WhatsApp: {COMPANY_INFO.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
