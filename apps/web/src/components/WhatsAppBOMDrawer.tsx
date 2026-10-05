import { Link } from 'react-router-dom';
import MaterialListEditor from './MaterialListEditor';
import type { MaterialItem, CatalogueProduct } from '../types';
import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Trash2,
  Send,
  Building,
  MapPin,
  Phone,
  FileText,
  CheckCircle2,
  Package,
} from 'lucide-react';
import WhatsAppIcon from './icons/WhatsAppIcon';
import { BrandLogo, getBrandMeta } from './icons/BrandBadges';

export default function WhatsAppBOMDrawer({
  isOpen,
  onClose,
  bomList,
  onRemoveBOMItem,
  onClearBOM,
  products = [],
}: { isOpen: boolean; onClose: () => void; bomList: MaterialItem[]; onRemoveBOMItem: (id: string) => void; onClearBOM: () => void; products?: CatalogueProduct[] }) {
  // Lock background scroll, pause Lenis / Locomotive scroll, and handle ESC
  useEffect(() => {
    if (!isOpen) return;

    // Pause smooth scrolling engines so background cannot be moved while drawer is open
    if (window.__lenis && typeof window.__lenis.stop === 'function') {
      window.__lenis.stop();
    }
    if (window.__locomotiveScroll && typeof window.__locomotiveScroll.stop === 'function') {
      window.__locomotiveScroll.stop();
    }

    // Freeze body & html scrolling, accounting for desktop scrollbar shift
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);

      // Re-enable smooth scrolling engines
      if (window.__lenis && typeof window.__lenis.start === 'function') {
        window.__lenis.start();
      }
      if (window.__locomotiveScroll && typeof window.__locomotiveScroll.start === 'function') {
        window.__locomotiveScroll.start();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ms-drawer-backdrop" onClick={onClose} data-lenis-prevent>
      <aside
        className="ms-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
            aria-label="Review quote list"
        data-lenis-prevent
      >
        {/* Drawer Header */}
        <div className="drawer-top-bar">
          <div className="drawer-title-group">
            <span className="drawer-eyebrow-tag">Selected materials</span>
            <h3 className="drawer-main-title">Your quote list</h3>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close Drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="drawer-body-scroll" data-lenis-prevent>
          <MaterialListEditor products={products} />
          <p className="customer-help">Your list is saved in this browser while you browse. Send it to the team with your quotation request.</p>
          <p className="customer-help">No online payment is collected. The team will confirm price, stock and delivery with you.</p>
          <Link className="btn btn-primary btn-block" to="/get-quote" onClick={onClose}>Request a quotation</Link>

        </div>
      </aside>
    </div>
  );
}
