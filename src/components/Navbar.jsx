import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, FileText, Menu, X, MapPin } from 'lucide-react';
import MaterialSquareLogo from './icons/MaterialSquareLogo';
import { COMPANY_INFO } from '../data/materialsData';

export default function Navbar({ onOpenBOM, onNavigateSection }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId) => {
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className={`ms-navbar ${isScrolled ? 'is-scrolled' : ''}`}>
      {/* Top Announcement & Service Bar */}
      <div className="ms-top-announcement">
        <div className="container announcement-inner">
          <div className="announcement-left">
            <span className="location-pill">
              <MapPin size={12} />
              <strong>Serving Delhi NCR:</strong> Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad
            </span>
          </div>

          <div className="announcement-right">
            <span className="slogan-badge">{COMPANY_INFO.sloganHindi}</span>
            <a
              href={`tel:${COMPANY_INFO.phone}`}
              className="top-phone-link"
              title="Call Material Square Hotline"
            >
              <Phone size={12} /> {COMPANY_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="ms-main-nav">
        <div className="container nav-container">
          {/* Official Reconstructed Logo */}
          <a
            href="#"
            className="ms-logo-link"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <MaterialSquareLogo size={42} showText={true} />
          </a>

          {/* Desktop Navigation Links */}
          <nav className="ms-desktop-menu">
            <button type="button" className="nav-item" onClick={() => handleNavClick('marketplace')}>
              Marketplace
            </button>
            <button type="button" className="nav-item" onClick={() => handleNavClick('five-calls')}>
              5 Calls vs 1 Call
            </button>
            <button type="button" className="nav-item" onClick={() => handleNavClick('brands')}>
              Top Brands
            </button>
            <button type="button" className="nav-item" onClick={() => handleNavClick('wire-guide')}>
              Wire Calculator
            </button>
            <button type="button" className="nav-item" onClick={() => handleNavClick('plumbing-guide')}>
              Plumbing Guide
            </button>
            <button type="button" className="nav-item" onClick={() => handleNavClick('site-bingo')}>
              Site Bingo
            </button>
          </nav>

          {/* Header Actions */}
          <div className="ms-nav-actions">
            {/* Direct WhatsApp Call Link */}
            <a
              href={COMPANY_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp btn-sm nav-wa-btn"
              title="Chat on WhatsApp with Material Square"
            >
              <MessageCircle size={15} />
              <span>WhatsApp Us</span>
            </a>

            {/* Post Material List / Upload BOM Button */}
            <button
              type="button"
              className="btn btn-orange btn-sm nav-bom-btn"
              onClick={onOpenBOM}
            >
              <FileText size={15} />
              <span>Send Material List</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              className="ms-hamburger-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="ms-mobile-dropdown">
          <div className="mobile-menu-links">
            <button type="button" onClick={() => handleNavClick('marketplace')}>
              Construction Marketplace
            </button>
            <button type="button" onClick={() => handleNavClick('five-calls')}>
              Why Make 5 Calls?
            </button>
            <button type="button" onClick={() => handleNavClick('brands')}>
              16 Verified Brands
            </button>
            <button type="button" onClick={() => handleNavClick('wire-guide')}>
              Wire Sizing Calculator
            </button>
            <button type="button" onClick={() => handleNavClick('plumbing-guide')}>
              Plumbing Basics (PVC / CPVC / uPVC)
            </button>
            <button type="button" onClick={() => handleNavClick('site-bingo')}>
              Construction Bingo & Solutions
            </button>
            <button type="button" className="mobile-bom-btn" onClick={() => { setMobileMenuOpen(false); onOpenBOM(); }}>
              <FileText size={16} /> Send Material List (BOM)
            </button>
            <a href={COMPANY_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mobile-wa-btn">
              <MessageCircle size={16} /> WhatsApp: {COMPANY_INFO.phoneDisplay}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
