import { parseSocialLinks, publicNavigation } from "@material-square/types";
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
import { COMPANY_INFO } from "../data/materialsData";
import { useSiteContent } from "../site-content";

export default function Footer() {
  const siteContent = useSiteContent();
  const socialLinks = parseSocialLinks(siteContent["footer.socialLinks"]);
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="ms-footer-section">
      <div className="container">
        {/* Top Highlight Banner */}
        <div className="footer-callout-banner">
          <div className="callout-left">
            <span className="badge-dark">Delhi NCR Construction Partner</span>
            <h3>{siteContent["footer.calloutTitle"]}</h3>
            <p>{siteContent["footer.calloutDescription"]}</p>
          </div>

          <div className="callout-right-actions">
            <a
              href={`tel:${siteContent["contact.phone"]}`}
              className="btn btn-outline"
            >
              <Phone size={16} />
              <span>Call {siteContent["contact.phoneDisplay"]}</span>
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
              "{siteContent["footer.slogan"]}"
            </p>
            <p className="footer-bio-para">
              {siteContent["footer.description"]}
            </p>

            {socialLinks.map((link) => (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-instagram-link"
                key={link.id}
              >
                {new URL(link.url).hostname.includes("instagram.com") ? (
                  <InstagramIcon size={16} />
                ) : (
                  <ExternalLink size={16} />
                )}
                <span>{link.label}</span>
              </a>
            ))}
          </div>

          {/* Quick Categories Col */}
          <div className="footer-col">
            <h4 className="footer-heading">Browse categories</h4>
            <ul className="footer-nav-list">
              <li>
                <Link to="/marketplace?category=cement">
                  Cement & aggregates
                </Link>
              </li>
              <li>
                <Link to="/marketplace?q=steel">Structural steel & rebar</Link>
              </li>
              <li>
                <Link to="/marketplace?category=pipes">Pipes & fittings</Link>
              </li>
              <li>
                <Link to="/marketplace?category=wires">Wires & electrical</Link>
              </li>
              <li>
                <Link to="/marketplace?category=paints">Paints & finishes</Link>
              </li>
              <li>
                <Link to="/marketplace?category=sanitary">
                  Sanitaryware & bath
                </Link>
              </li>
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
          <div className="footer-col">
            <h4 className="footer-heading">Service Hub & Logistics</h4>
            <div className="footer-info-item">
              <MapPin size={16} className="f-icon" />
              <span>{siteContent["contact.location"]}</span>
            </div>
            <div className="footer-info-item">
              <Phone size={16} className="f-icon" />
              <span>{siteContent["contact.phoneDisplay"]}</span>
            </div>
            <div className="footer-info-item">
              <Mail size={16} className="f-icon" />
              <span>{siteContent["contact.email"]}</span>
            </div>

            <div className="footer-assurance-box">
              <ShieldCheck size={16} />
              <span>
                Product, price, tax and delivery details are confirmed with
                staff.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-row">
          <p className="copyright-text">
            © {new Date().getFullYear()} Material Square. All rights reserved.
            Building Better Together.
          </p>

          <nav className="footer-legal-links" aria-label="Legal information">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Website terms</Link>
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
