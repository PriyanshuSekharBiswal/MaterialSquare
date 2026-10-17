import PageMetadata from "./components/PageMetadata";
import { CustomerProvider, useCustomer } from './customer';
import { CustomerAuthProvider } from './context/CustomerAuthContext';
import { CustomerProtectedRoute } from './components/CustomerProtectedRoute';
import './customer.css';
import './customer-portal.css';
import type { CatalogueProduct, MaterialItem } from './types';
import React, { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useNavigationType, UNSAFE_LocationContext, type Location as RouterLocation } from 'react-router-dom';
import './App.css';
import useScrollReveal from './hooks/useScrollReveal';
import { trackWebsiteEvent } from './analytics';
import { SiteContentProvider, useSiteContent } from './site-content';
import { whatsappLink } from './messages';
import { prefetchPublicContent } from './public-content-cache';
import { isInitialReloadForCurrentLocation } from './scroll-position';

// Global Shell Components
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
const ManagedWebsitePage = lazy(() => import("./pages/ManagedWebsitePage"));
const HomePage = lazy(() => import('./pages/HomePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const WhyUsPage = lazy(() => import('./pages/WhyUsPage'));
const EngineeringGuidesPage = lazy(() => import('./pages/EngineeringGuidesPage'));
const GetQuotePage = lazy(() => import('./pages/GetQuotePage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BlogIndexPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.BlogIndexPage })));
const BlogDetailPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.BlogDetailPage })));
const ExpertsPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.ExpertsPage })));
const ServiceAreaPage = lazy(() => import('./pages/BusinessContentPages').then((m) => ({ default: m.ServiceAreaPage })));
const PrivacyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.TermsPage })));
const ShippingPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.ShippingPage })));
const ReturnPolicyPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.ReturnPolicyPage })));
const FaqPage = lazy(() => import('./pages/LegalPages').then((m) => ({ default: m.FaqPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const MaterialListPage = lazy(() => import('./pages/MaterialListPage'));
const CustomerAccountPage = lazy(() => import('./pages/CustomerAccountPage'));

// Floating Icons
import { FileText } from 'lucide-react';
import WhatsAppIcon from './components/icons/WhatsAppIcon';

function AppShell() {
  const siteContent = useSiteContent();
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const previousRouteLocation = useRef(location);
  const [routeHistory, setRouteHistory] = useState(() => [location]);
  useScrollReveal();

  useLayoutEffect(() => {
    const previous = previousRouteLocation.current;
    previousRouteLocation.current = location;
    if (previous.key === location.key) return;

    setRouteHistory((current) => {
      const previousIndex = current.findIndex((entry) => entry.key === previous.key);
      if (navigationType === "PUSH") {
        const retained = previousIndex >= 0 ? current.slice(0, previousIndex + 1) : current;
        return [...retained, location];
      }
      if (navigationType === "REPLACE") {
        const retained = previousIndex >= 0 ? current.slice(0, previousIndex) : current;
        return [...retained, location];
      }
      return current.some((entry) => entry.key === location.key)
        ? current
        : [...current, location];
    });
  }, [location, navigationType]);

  // Keep each visited route entry mounted. Browser Back (including trackpad
  // swipe-back) can then reveal the exact component instance and its local
  // form, filter, selection, and scroll-container state.
  const cachedRouteEntries: RouterLocation[] = routeHistory.some((entry) => entry.key === location.key)
    ? routeHistory
    : [...routeHistory, location];

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("draftPreview") === "1")
      return;
    const page = location.pathname === "/" ? "home"
      : location.pathname === "/marketplace" ? "marketplace"
      : location.pathname === "/why-us" ? "why-us"
      : location.pathname === "/guides" ? "guides"
      : location.pathname === "/get-quote" ? "get-quote"
      : location.pathname === "/contact" ? "contact"
      : location.pathname.startsWith("/blogs") ? "blogs"
      : location.pathname === "/experts" ? "experts"
      : null;
    if (page) trackWebsiteEvent({ type: "page_view", target: page });
  }, [location.pathname]);

  const [catalogue, setCatalogue] = useState<CatalogueProduct[]>([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const [catalogueUnavailable, setCatalogueUnavailable] = useState(false);
  const [catalogueRetry, setCatalogueRetry] = useState(0);
  const [showReloadSkeleton, setShowReloadSkeleton] = useState(isInitialReloadForCurrentLocation);

  useEffect(() => {
    document.documentElement.dataset.msScrollReady = catalogueLoaded ? "true" : "false";
    if (!catalogueLoaded) return;
    const completeReload = () => {
      document.getElementById("root")?.style.removeProperty("min-height");
      setShowReloadSkeleton(false);
    };
    if (isInitialReloadForCurrentLocation()) {
      window.addEventListener("ms-scroll-restored", completeReload, { once: true });
      return () => window.removeEventListener("ms-scroll-restored", completeReload);
    }
    completeReload();
  }, [catalogueLoaded]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      prefetchPublicContent("/blogs");
      prefetchPublicContent("/experts");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/products`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Catalogue request failed");
        return response.json() as Promise<CatalogueProduct[]>;
      })
      .then((items) => {
        if (!Array.isArray(items)) throw new Error("Catalogue response was invalid");
        setCatalogue(items);
        setCatalogueUnavailable(false);
        setCatalogueLoaded(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCatalogue([]);
        setCatalogueUnavailable(true);
        setCatalogueLoaded(true);
      });
    return () => controller.abort();
  }, [catalogueRetry]);

  const retryCatalogue = () => {
    setShowReloadSkeleton(true);
    setCatalogueLoaded(false);
    setCatalogueRetry((attempt) => attempt + 1);
  };

  const { items: bomList, updateItems: setBOMList } = useCustomer();
  const openBOMDrawer = () => {
    navigate('/material-list');
  };
  const handleToggleBOM = (product: MaterialItem) => {
    const catalogueProduct = catalogue.find(item => item.id === product.id);
    if (catalogueProduct?.specs?.sizes || catalogueProduct?.variants?.length) { navigate(`/product/${encodeURIComponent(catalogueProduct.id)}`); return; }
    setBOMList((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) return prev;
      if (catalogueProduct) trackWebsiteEvent({ type: "add_to_list", target: catalogueProduct.id });
      return [...prev, { ...product, catalogueId: catalogueProduct?.id || product.id, quantity: product.quantity || 1 }];
    });
  };

  const handleAddCustomToBOM = (customItem: MaterialItem) => {
    setBOMList((previous) => previous.some((item) => item.id === customItem.id) ? previous : [...previous, customItem]);
    navigate('/material-list');
  };

  return (
    <>
      <ScrollToTop />
      {showReloadSkeleton && !catalogueLoaded && (
        <div className="ms-reload-skeleton" role="status" aria-label="Loading materials">
          <div className="ms-reload-skeleton-head"><i /><i /></div>
          <div className="ms-reload-skeleton-grid">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>
        </div>
      )}
      <div className="ms-construction-app">
        {/* Navigation and client-configured contact actions */}
        <PageMetadata products={catalogue} catalogueLoaded={catalogueLoaded} />
        <Header
          bomCount={bomList.length}
        />

        {/* Dedicated Route Views with smooth transition on section change */}
        <main id="main-content" className="app-main-content">
          {cachedRouteEntries.map((routeLocation) => (
          <UNSAFE_LocationContext.Provider key={routeLocation.key} value={{ location: routeLocation, navigationType }}>
          <div className="ms-page-transition-wrapper" hidden={routeLocation.key !== location.key}>
            <Suspense fallback={<div className="page-loading-skeleton" role="status" aria-label="Loading page"><i /><i /><i /><i /></div>}>
            <Routes location={routeLocation}>
              {/* 1. Home Page */}
              <Route
                path="/"
                element={
                  <HomePage
                    products={catalogue}
                    catalogueUnavailable={catalogueUnavailable}
                    onRetryCatalogue={retryCatalogue}
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
                    catalogueLoading={!catalogueLoaded}
                    catalogueUnavailable={catalogueUnavailable}
                    onRetryCatalogue={retryCatalogue}
                    bomList={bomList}
                    onToggleBOM={handleToggleBOM}
                    onOpenProduct={(product, query, variantId) => {
                      const params = new URLSearchParams();
                      if (query?.trim()) params.set("q", query.trim());
                      if (variantId) params.set("variant", variantId);
                      navigate(`/product/${encodeURIComponent(product.id)}${params.size ? `?${params.toString()}` : ""}`);
                    }}
                    onOpenBOMDrawer={openBOMDrawer}
                  />
                }
              />

              <Route path="/product/:productId" element={<ProductDetailPage products={catalogue} loading={!catalogueLoaded} catalogueUnavailable={catalogueUnavailable} onRetryCatalogue={retryCatalogue} />} />
              <Route path="/material-list" element={<MaterialListPage products={catalogue} catalogueLoading={!catalogueLoaded} />} />
              <Route path="/account" element={<CustomerAccountPage />} />
              <Route
                path="/account/*"
                element={
                  <CustomerProtectedRoute>
                    <CustomerAccountPage />
                  </CustomerProtectedRoute>
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
                element={
                  <GetQuotePage
                    bomList={bomList}
                    products={catalogue}
                    catalogueLoading={!catalogueLoaded}
                  />
                }
              />

              {/* 6. Contact & Depots */}
              <Route
                path="/contact"
                element={<ContactPage />}
              />
              <Route path="/blogs" element={<BlogIndexPage />} />
              <Route path="/blogs/:slug" element={<BlogDetailPage />} />
              <Route path="/experts" element={<ExpertsPage />} />
              <Route path="/locations/:slug" element={<ServiceAreaPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/return-policy" element={<ReturnPolicyPage />} />
              <Route path="/faq" element={<FaqPage />} />

              {/* Fallback to Home */}
              <Route path="*" element={<ManagedWebsitePage />} />
            </Routes>
            </Suspense>
          </div>
          </UNSAFE_LocationContext.Provider>
          ))}
        </main>

        {/* Brand Footer */}
        <Footer />

        {/* Keep the floating dock off pages with their own controls and forms. */}
        {location.pathname !== "/marketplace" &&
          location.pathname !== "/material-list" &&
          location.pathname !== "/get-quote" &&
          location.pathname !== "/contact" &&
          !location.pathname.startsWith("/product/") &&
          !location.pathname.startsWith("/account") && (
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

            {siteContent["contact.whatsappPhone"] && <a
              href={whatsappLink("Material Square — General Enquiry", siteContent["contact.whatsappPhone"])}
              target="_blank"
              rel="noopener noreferrer"
              className="dock-whatsapp-btn"
              title="Contact the Material Square team on WhatsApp"
              aria-label="Chat on WhatsApp"
            >
              <WhatsAppIcon size={22} color="#ffffff" />
              <span className="dock-label">WhatsApp</span>
            </a>}
          </aside>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <SiteContentProvider>
        <CustomerAuthProvider>
          <CustomerProvider>
            <AppShell />
          </CustomerProvider>
        </CustomerAuthProvider>
      </SiteContentProvider>
    </Router>
  );
}
