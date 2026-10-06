import { publicNavigation } from "@material-square/types";
import type { MaterialItem, CatalogueProduct } from "../types";
import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Phone,
  FileText,
  Menu,
  X,
  MapPin,
  ArrowRight,
  UserRound,
} from "lucide-react";
import MaterialSquareLogo from "./icons/MaterialSquareLogo";
import { useSiteContent } from "../site-content";

export default function Header({
  bomCount,
}: {
  bomCount: number;
}) {
  const siteContent = useSiteContent();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = publicNavigation(siteContent);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="ms-site-header">
      {/* Top Location & Direct Dispatch Bar */}
      <div className="ms-top-bar">
        <div className="container top-bar-content">
          <div className="top-bar-left">
            <span className="location-tag">
              <MapPin size={12} className="loc-icon" />
              <strong className="top-bar-serving">Serving Delhi NCR</strong>
              <span className="top-bar-cities">: {siteContent["contact.location"] || "Noida, Greater Noida, Delhi, Gurugram, Ghaziabad & Faridabad"}</span>
            </span>
          </div>

          <div className="top-bar-right">
            {siteContent["contact.phone"] && <a
              href={`tel:${siteContent["contact.phone"]}`}
              className="hotline-phone"
              title="Call Material Square Hotline"
            >
              <Phone size={12} />
              <span className="hotline-text">
                {siteContent["contact.phoneDisplay"] || siteContent["contact.phone"]}
              </span>
            </a>}
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="ms-nav-main">
        <div className="container nav-content">
          {/* Logo */}
          <Link
            to="/"
            className="nav-logo"
            onClick={closeMenu}
            aria-label="Material Square Home"
          >
            <MaterialSquareLogo size={42} showText={true} />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="desktop-nav-links" aria-label="Main Navigation">
            {navigation.map((entry) =>
              entry.external ? (
                <a
                  key={entry.id}
                  href={entry.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link"
                >
                  {entry.label}
                </a>
              ) : (
                <NavLink
                  key={entry.id}
                  to={entry.path}
                  end={entry.path === "/"}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                >
                  {entry.label}
                </NavLink>
              ),
            )}
          </nav>

          {/* Action CTAs */}
          <div className="nav-action-buttons">
            <Link
              to="/material-list"
              className={`nav-btn nav-btn-outline nav-bom-trigger ${bomCount > 0 ? "has-items" : ""}`}
              onClick={closeMenu}
              title="View your saved material list"
              aria-label="Material List"
            >
              <FileText size={15} />
              {bomCount > 0 && <span className="bom-counter">{bomCount}</span>}
            </Link>

            <Link
              to="/account"
              className="nav-btn nav-btn-outline nav-account-trigger"
              onClick={closeMenu}
              title="Sign in to your customer account"
            >
              <UserRound size={15} />
              <span>Account</span>
            </Link>

            <Link
              to="/get-quote"
              onClick={closeMenu}
              className="nav-btn nav-btn-primary nav-quote-btn"
              title="Request a customized quote for your construction materials"
            >
              <span>Get Quote</span>
              <ArrowRight size={14} className="quote-arrow" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className={`mobile-nav-toggle ${mobileMenuOpen ? "is-active" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-menu-pane">
          <div className="container mobile-links-list">
            {navigation.map((entry) =>
              entry.external ? (
                <a
                  key={entry.id}
                  href={entry.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="mobile-nav-item"
                >
                  {entry.label}
                </a>
              ) : (
                <NavLink
                  key={entry.id}
                  to={entry.path}
                  end={entry.path === "/"}
                  onClick={closeMenu}
                  className="mobile-nav-item"
                >
                  {entry.label}
                </NavLink>
              ),
            )}

            <div className="mobile-actions-stack">
              <Link
                to="/get-quote"
                onClick={closeMenu}
                className="btn btn-primary btn-block mobile-quote-cta"
              >
                <span>Get Instant Quote</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/account"
                onClick={closeMenu}
                className="btn btn-secondary btn-block"
              >
                <UserRound size={16} />
                <span>Customer account</span>
              </Link>
              <Link
                to="/material-list"
                className="btn btn-secondary btn-block"
                onClick={closeMenu}
              >
                <FileText size={16} />
                <span>View Material List ({bomCount})</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
