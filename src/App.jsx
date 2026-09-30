import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { PRODUCTS, COMPANY_INFO } from './data/materialsData';
import useScrollReveal from './hooks/useScrollReveal';
import useSmoothScroll from './hooks/useSmoothScroll';

// Global Shell Components
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProductDetailModal from './components/ProductDetailModal';
import WhatsAppBOMDrawer from './components/WhatsAppBOMDrawer';

// Dedicated Pages
import HomePage from './pages/HomePage';
import MarketplacePage from './pages/MarketplacePage';
import WhyUsPage from './pages/WhyUsPage';
import EngineeringGuidesPage from './pages/EngineeringGuidesPage';
import GetQuotePage from './pages/GetQuotePage';
import ContactPage from './pages/ContactPage';

// Floating Icons
import { FileText } from 'lucide-react';
import WhatsAppIcon from './components/icons/WhatsAppIcon';

function AppShell() {
  const location = useLocation();
  useScrollReveal();
  useSmoothScroll();

  const [isBOMOpen, setIsBOMOpen] = useState(false);
  const [activeProductModal, setActiveProductModal] = useState(null);

  // Pre-seed with UltraTech Super and Astral CPVC for immediate usability
  const [bomList, setBOMList] = useState([
    PRODUCTS[0], // UltraTech Super
    PRODUCTS[4], // Astral CPVC Pro
  ]);

  const handleToggleBOM = (product) => {
    setBOMList((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const handleAddCustomToBOM = (customItem) => {
    setBOMList((prev) => {
      const exists = prev.some((item) => item.id === customItem.id);
      if (exists) return prev;
      return [...prev, customItem];
    });
    setIsBOMOpen(true);
  };

  const handleRemoveBOMItem = (id) => {
    setBOMList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearBOM = () => {
    setBOMList([]);
  };

  return (
    <>
      <ScrollToTop />
      <div className="ms-construction-app">
        {/* Navigation Header with Delhi NCR Hotline & Navigation Links */}
        <Header
          bomCount={bomList.length}
          onOpenBOMDrawer={() => setIsBOMOpen(true)}
        />

        {/* Dedicated Route Views with smooth transition on section change */}
        <main id="main-content" className="app-main-content">
          <div key={location.pathname} className="ms-page-transition-wrapper">
            <Routes>
              {/* 1. Home Page */}
              <Route
                path="/"
                element={
                  <HomePage
                    onOpenBOMDrawer={() => setIsBOMOpen(true)}
                    bomList={bomList}
                    onToggleBOM={handleToggleBOM}
                  />
                }
              />

              {/* 2. Materials Marketplace Catalog */}
              <Route
                path="/marketplace"
                element={
                  <MarketplacePage
                    bomList={bomList}
                    onToggleBOM={handleToggleBOM}
                    onOpenProductModal={(product) => setActiveProductModal(product)}
                    onOpenBOMDrawer={() => setIsBOMOpen(true)}
                  />
                }
              />

              {/* 3. Why Material Square (5 Calls vs 1 Call) */}
              <Route
                path="/why-us"
                element={
                  <WhyUsPage
                    onOpenBOMDrawer={() => setIsBOMOpen(true)}
                  />
                }
              />

              {/* 4. Engineering Guides & Wire Load Calculator */}
              <Route
                path="/guides"
                element={
                  <EngineeringGuidesPage
                    onAddCustomToBOM={handleAddCustomToBOM}
                    onOpenBOMDrawer={() => setIsBOMOpen(true)}
                  />
                }
              />

              {/* 5. Request Quote & Upload BOM */}
              <Route
                path="/get-quote"
                element={
                  <GetQuotePage
                    onAddCustomToBOM={handleAddCustomToBOM}
                  />
                }
              />

              {/* 6. Contact & Depots */}
              <Route
                path="/contact"
                element={<ContactPage />}
              />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Brand Footer */}
        <Footer />

        {/* Product Specification Modal */}
        <ProductDetailModal
          product={activeProductModal}
          isOpen={Boolean(activeProductModal)}
          onClose={() => setActiveProductModal(null)}
          inBOM={activeProductModal ? bomList.some((b) => b.id === activeProductModal.id) : false}
          onToggleBOM={handleToggleBOM}
        />

        {/* WhatsApp Bill-of-Materials (BOM) Slide-in Drawer */}
        <WhatsAppBOMDrawer
          isOpen={isBOMOpen}
          onClose={() => setIsBOMOpen(false)}
          bomList={bomList}
          onRemoveBOMItem={handleRemoveBOMItem}
          onClearBOM={handleClearBOM}
        />

        {/* Floating Quick Action Widget on Mobile & Desktop */}
        <aside className="floating-action-dock" aria-label="Quick Actions">
          <button
            type="button"
            className={`dock-bom-btn ${bomList.length > 0 ? 'has-items' : ''}`}
            onClick={() => setIsBOMOpen(true)}
            title="Open Material List"
            aria-label={`Open Material List with ${bomList.length} items`}
          >
            <FileText size={20} />
            <span className="dock-label">Material List</span>
            {bomList.length > 0 && <span className="dock-badge">{bomList.length}</span>}
          </button>

          <a
            href={COMPANY_INFO.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dock-whatsapp-btn"
            title="Chat with Procurement Coordinator on WhatsApp"
            aria-label="Chat on WhatsApp"
          >
            <WhatsAppIcon size={22} color="#ffffff" />
            <span className="dock-label">WhatsApp</span>
          </a>
        </aside>
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  );
}
