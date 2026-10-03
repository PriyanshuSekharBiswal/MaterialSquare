import { CustomerProvider, useCustomer } from './customer';
import './customer.css';
import type { CatalogueProduct, MaterialItem } from './types';
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import { COMPANY_INFO } from './data/materialsData';
import useScrollReveal from './hooks/useScrollReveal';
import useSmoothScroll from './hooks/useSmoothScroll';
import { trackWebsiteEvent } from './analytics';

// Global Shell Components
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
const AccountPage = lazy(() => import('./pages/AccountPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const WhyUsPage = lazy(() => import('./pages/WhyUsPage'));
const EngineeringGuidesPage = lazy(() => import('./pages/EngineeringGuidesPage'));
const GetQuotePage = lazy(() => import('./pages/GetQuotePage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BlogIndexPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.BlogIndexPage })));
const BlogDetailPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.BlogDetailPage })));
const ExpertsPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.ExpertsPage })));
const PrivacyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const ProductDetailModal = lazy(() => import('./components/ProductDetailModal'));
const WhatsAppBOMDrawer = lazy(() => import('./components/WhatsAppBOMDrawer'));

// Floating Icons
import { FileText } from 'lucide-react';
import WhatsAppIcon from './components/icons/WhatsAppIcon';

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  useScrollReveal();
  useSmoothScroll();

  useEffect(() => {
    const page = location.pathname === "/" ? "home"
      : location.pathname === "/marketplace" ? "marketplace"
      : location.pathname === "/why-us" ? "why-us"
      : location.pathname === "/guides" ? "guides"
      : location.pathname === "/get-quote" ? "get-quote"
      : location.pathname === "/contact" ? "contact"
      : location.pathname.startsWith("/blogs") ? "blogs"
      : location.pathname === "/experts" ? "experts"
      : location.pathname === "/account" ? "account"
      : null;
    if (page) trackWebsiteEvent({ type: "page_view", target: page });
  }, [location.pathname]);

  const [isBOMOpen, setIsBOMOpen] = useState(false);
  const [activeProductModal, setActiveProductModal] = useState<CatalogueProduct | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/products`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<CatalogueProduct[]> : null)
      .then((items) => { if (Array.isArray(items)) setCatalogue(items); })
      .catch(() => { /* Public browsing stays available; only API-published listings are shown. */ });
    return () => controller.abort();
  }, []);

  const { customer, ready, items: bomList, updateItems: setBOMList } = useCustomer();
  const requireCustomer = () => {
    if (customer) return true;
    navigate("/account?next=/get-quote");
    return false;
  };
  const openBOMDrawer = () => {
    if (requireCustomer()) setIsBOMOpen(true);
  };
  const handleToggleBOM = (product: MaterialItem) => {
    const catalogueProduct = catalogue.find(item => item.id === product.id);
    if (catalogueProduct?.specs?.sizes) { setActiveProductModal(catalogueProduct); return; }
    setBOMList((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      if (catalogueProduct) trackWebsiteEvent({ type: "add_to_list", target: catalogueProduct.id });
      return [...prev, product];
    });
    if (!customer) navigate("/account?next=/get-quote");
  };

  const handleAddCustomToBOM = (customItem: MaterialItem) => {
    setBOMList((prev) => {
      const exists = prev.some((item) => item.id === customItem.id);
      if (exists) return prev;
      return [...prev, customItem];
    });
    if (customer) setIsBOMOpen(true);
    else navigate("/account?next=/get-quote");
  };

  const handleRemoveBOMItem = (id: string) => {
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
          onOpenBOMDrawer={openBOMDrawer}
        />

        {/* Dedicated Route Views with smooth transition on section change */}
        <main id="main-content" className="app-main-content">
          <div key={location.pathname} className="ms-page-transition-wrapper">
            <Suspense fallback={<p className="page-loading-state" role="status">Loading page…</p>}>
            <Routes>
              <Route path="/account" element={<AccountPage />} />
              {/* 1. Home Page */}
              <Route
                path="/"
                element={
                  <HomePage
                    products={catalogue}
                    onOpenBOMDrawer={openBOMDrawer}
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
                    products={catalogue}
                    bomList={bomList}
                    onToggleBOM={handleToggleBOM}
                    onOpenProductModal={(product) => {
                      trackWebsiteEvent({ type: "product_view", target: product.id });
                      setActiveProductModal(product);
                    }}
                    onOpenBOMDrawer={openBOMDrawer}
                  />
                }
              />

              {/* 3. Why Material Square (5 Calls vs 1 Call) */}
              <Route
                path="/why-us"
                element={
                  <WhyUsPage
                    onOpenBOMDrawer={openBOMDrawer}
                  />
                }
              />

              {/* 4. Engineering Guides & Wire Load Calculator */}
              <Route
                path="/guides"
                element={
                  <EngineeringGuidesPage
                    onAddCustomToBOM={handleAddCustomToBOM}
                    onOpenBOMDrawer={openBOMDrawer}
                  />
                }
              />

              {/* 5. Request Quote & Upload BOM */}
              <Route
                path="/get-quote"
                element={customer ? (
                  <GetQuotePage
                    bomList={bomList}
                  />
                ) : ready ? (
                  <Navigate to="/account?next=/get-quote" replace />
                ) : null}
              />

              {/* 6. Contact & Depots */}
              <Route
                path="/contact"
                element={<ContactPage />}
              />
              <Route path="/blogs" element={<BlogIndexPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route path="/experts" element={<ExpertsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />

              {/* Fallback to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </div>
        </main>

        {/* Brand Footer */}
        <Footer />

        {/* Product Specification Modal */}
        {activeProductModal && <Suspense fallback={null}><ProductDetailModal
          product={activeProductModal}
          isOpen={Boolean(activeProductModal)}
          onClose={() => setActiveProductModal(null)}
          inBOM={activeProductModal ? bomList.some((b) => b.id === activeProductModal.id) : false}
          onToggleBOM={handleToggleBOM}
        /></Suspense>}

        {/* WhatsApp Bill-of-Materials (BOM) Slide-in Drawer */}
        {isBOMOpen && <Suspense fallback={null}><WhatsAppBOMDrawer
          isOpen={isBOMOpen}
          onClose={() => setIsBOMOpen(false)}
          bomList={bomList}
          onRemoveBOMItem={handleRemoveBOMItem}
          onClearBOM={handleClearBOM}
        /></Suspense>}

        {/* Floating Quick Action Widget on Mobile & Desktop */}
        <aside className="floating-action-dock" aria-label="Quick Actions">
          <button
            type="button"
            className={`dock-bom-btn ${bomList.length > 0 ? 'has-items' : ''}`}
            onClick={openBOMDrawer}
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
      <CustomerProvider><AppShell /></CustomerProvider>
    </Router>
  );
}
