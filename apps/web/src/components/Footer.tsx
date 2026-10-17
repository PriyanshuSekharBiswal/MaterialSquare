import { formatContactPhone, siteSocialLinks, publicNavigation } from "@material-square/types";
import React from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  MapPin,
  Mail,
  ArrowUp,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import MaterialSquareLogo from "./icons/MaterialSquareLogo";
import InstagramIcon from "./icons/InstagramIcon";
import WhatsAppIcon from "./icons/WhatsAppIcon";
import { useSiteContent } from "../site-content";
import { whatsappLink } from "../messages";
import { parsePolicy } from "@material-square/types";
import { useCatalogueCategories } from "../catalogue/useCatalogueCategories";

export default function Footer() {
  const siteContent = useSiteContent();
  const managedCategories = useCatalogueCategories();
  const socialLinks = siteSocialLinks(siteContent);
  const privacyPolicy = parsePolicy(siteContent["policy.privacy"], "privacy");
  const termsPolicy = parsePolicy(siteContent["policy.terms"], "terms");
  const privacyPublished = privacyPolicy.published;
  const termsPublished = termsPolicy.published;
  const categories = managedCategories.map(({ id, label }) => [id, label] as const);
  const phone = siteContent["contact.phone"] || "";
  const phoneDisplay = formatContactPhone(phone);
  const phoneTarget = phone || phoneDisplay;
  const whatsappPhone = siteContent["contact.whatsappPhone"] || "";
  const email = siteContent["contact.email"] || "";
  const location = siteContent["contact.location"] || "";
  const instagramProfile = socialLinks.find((link) => new URL(link.url).hostname.includes("instagram.com"));
  const additionalSocialLinks = socialLinks.filter((link) => !new URL(link.url).hostname.includes("instagram.com"));
  const contactDetails = Boolean(
    siteContent["contact.location"] ||
    siteContent["contact.phone"] ||
    siteContent["contact.whatsappPhone"] ||
    siteContent["contact.email"] ||
    socialLinks.length > 0,
  );
  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };

  return (
    <footer className="ms-footer-section">
      <div className="container">
        {/* Top Highlight Banner */}
        <div className="footer-callout-banner">
          <div className="callout-left">
            <span className="badge-dark">Construction materials catalogue</span>
            <h3>{siteContent["footer.calloutTitle"]}</h3>
            <p>{siteContent["footer.calloutDescription"]}</p>
          </div>

          <div className="callout-right-actions">
            {phone && <a
              href={`tel:${siteContent["contact.phone"]}`}
              className="btn btn-outline"
            >
              <Phone size={16} />
              <span>Call {phoneDisplay}</span>
            </a>}

            {whatsappPhone && <a
              href={whatsappLink("Material Square — General Enquiry\n\nHello, I would like help with construction materials for my project.", whatsappPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              <WhatsAppIcon size={18} color="#ffffff" />
              <span>WhatsApp Us Now</span>
            </a>}
          </div>
        </div>

        {/* 4 Columns Grid */}
        <div className="footer-columns-grid">
          {/* Brand Col */}
          <div className="footer-col brand-col">
            <MaterialSquareLogo size={46} showText={true} lightMode={true} />
            {siteContent["footer.slogan"] && <p className="footer-tagline-para">
              "{siteContent["footer.slogan"]}"
            </p>}
            <p className="footer-bio-para">
              {siteContent["footer.description"]}
            </p>

          </div>

          {/* Quick Categories Col */}
          <div className="footer-col">
            <h4 className="footer-heading">Browse categories</h4>
            <ul className="footer-nav-list">
              {categories.length ? categories.map(([id, label]) => (
                <li key={id}>
                  <Link to={`/marketplace?category=${encodeURIComponent(id)}`}>
                    {label}
                  </Link>
                </li>
              )) : (
                <li><Link to="/marketplace">Browse all products</Link></li>
              )}
            </ul>
          </div>

          {/* Dedicated Pages Navigation */}
          <div className="footer-col">
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-nav-list">
              {publicNavigation(siteContent).map((entry) => (
                <li key={entry.id}>
                  {entry.external ? (
                    <a
                      href={entry.path}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {entry.label}
                    </a>
                  ) : (
                    <Link to={entry.path}>{entry.label}</Link>
                  )}
                </li>
              ))}
              <li>
                <Link to="/get-quote">Get Quote</Link>
              </li>
            </ul>
          </div>

          {/* Depot & Service Areas Col */}
          {contactDetails && <div className="footer-col">
            <h4 className="footer-heading">Contact details</h4>
            {location && <a
              className="footer-info-item footer-info-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${location} in Google Maps`}
            >
              <MapPin size={16} className="f-icon" />
              <span>{location}</span>
            </a>}
            {phoneDisplay && <a
              className="footer-info-item footer-info-link"
              href={`tel:${phoneTarget.replace(/[^\d+]/g, "")}`}
              aria-label={`Call ${phoneDisplay}`}
            >
              <Phone size={16} className="f-icon" />
              <span>{phoneDisplay}</span>
            </a>}
            {email && <a
              className="footer-info-item footer-info-link"
              href={`mailto:${email}`}
              aria-label={`Email ${email}`}
            >
              <Mail size={16} className="f-icon" />
              <span>{email}</span>
            </a>}
            {instagramProfile && <a
              className="footer-info-item footer-info-link"
              href={instagramProfile.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit Material Square on Instagram"
            >
              <InstagramIcon size={16} className="f-icon" />
              <span>{instagramProfile.label}</span>
            </a>}
            {additionalSocialLinks.map((link) => (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-info-item footer-info-link"
                key={link.id}
                aria-label={`Visit Material Square on ${link.label}`}
              >
                <ExternalLink size={16} className="f-icon" />
                <span>{link.label}</span>
              </a>
            ))}

            <div className="footer-assurance-box">
              <ShieldCheck size={16} />
              <span>
                Product, price, tax and delivery details are confirmed with
                staff.
              </span>
            </div>
          </div>}
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-row">
          <p className="copyright-text">
            © {new Date().getFullYear()} Material Square. All rights reserved.
          </p>

          <nav className="footer-legal-links" aria-label="Legal information">
            {privacyPublished && <Link to="/privacy">Privacy</Link>}
            {termsPublished && <Link to="/terms">Website terms</Link>}
          </nav>

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
