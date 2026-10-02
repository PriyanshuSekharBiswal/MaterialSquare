import { Link } from 'react-router-dom';
import MaterialListEditor from './MaterialListEditor';
import { useCustomer } from '../customer';
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
import { COMPANY_INFO } from '../data/materialsData';

export default function WhatsAppBOMDrawer({
  isOpen,
  onClose,
  bomList,
  onRemoveBOMItem,
  onClearBOM,
}: { isOpen: boolean; onClose: () => void; bomList: MaterialItem[]; onRemoveBOMItem: (id: string) => void; onClearBOM: () => void }) {
  const { customer, saving, error } = useCustomer();
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
        aria-label="Send Material List"
        data-lenis-prevent
      >
        {/* Drawer Header */}
        <div className="drawer-top-bar">
          <div className="drawer-title-group">
            <span className="drawer-eyebrow-tag">"{COMPANY_INFO.sloganHindi}"</span>
            <h3 className="drawer-main-title">Project Material List (BOM)</h3>
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
          <MaterialListEditor />
          <p className="customer-help">{customer ? (error ? 'Your latest changes could not be saved. Check the message above.' : saving ? 'Saving your material list…' : 'Your list is saved to your account.') : 'Sign in to save your list across devices.'}</p>
          <Link className="btn btn-primary btn-block" to="/get-quote" onClick={onClose}>Add delivery details & request a quote</Link>

        </div>
      </aside>
    </div>
  );
}
