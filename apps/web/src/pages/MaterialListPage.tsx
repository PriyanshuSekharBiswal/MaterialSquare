import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList, FileText, UserRound } from "lucide-react";
import MaterialListEditor from "../components/MaterialListEditor";
import MaterialCartFinder from "../components/MaterialCartFinder";
import { useCustomer } from "../customer";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import type { CatalogueProduct } from "../types";

export default function MaterialListPage({ products, catalogueLoading = false }: { products: CatalogueProduct[]; catalogueLoading?: boolean }) {
  const { items } = useCustomer();
  const { isAuthenticated, checking } = useCustomerAuth();
  const quoteItems = items.filter((item) => item.includeInQuote !== false);
  const productCount = new Set(quoteItems.map((item) => item.catalogueId || item.id)).size;
  const pricedQuoteItems = quoteItems.filter((item) => item.price != null && Number.isFinite(Number(item.price)));
  const estimatedTotal = pricedQuoteItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
  return (
    <section className="material-list-page container">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span aria-current="page">Material List</span></nav>
      <Link className="product-back-link" to="/marketplace"><ArrowLeft size={16} /> Continue browsing</Link>
      <header className="material-list-page-header">
        <span className="badge-pill badge-orange-pill"><ClipboardList size={14} /> Your selected materials</span>
        <h1>Your cart</h1>
        <p>Keep materials here for later. Select only the items you want included in a quotation now; the rest stay in your cart.</p>
      </header>
      <div className="material-list-page-grid">
        <div className="material-list-page-items"><MaterialListEditor products={products} /></div>
        <div className="material-list-sidebar">
          <aside className="material-list-summary">
            <span>QUOTATION SUMMARY</span>
            <h2>{quoteItems.length} quote line{quoteItems.length === 1 ? "" : "s"} selected</h2>
            <p className="material-list-summary-products">Across {productCount} product{productCount === 1 ? "" : "s"}</p>
            {pricedQuoteItems.length > 0 && <div className="material-list-estimated-total">
              <span>{pricedQuoteItems.length === quoteItems.length ? "Estimated material cost" : "Estimate for priced items"}</span>
              <strong>₹{estimatedTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
              {pricedQuoteItems.length < quoteItems.length && <small>{quoteItems.length - pricedQuoteItems.length} item{quoteItems.length - pricedQuoteItems.length === 1 ? "" : "s"} need pricing confirmation</small>}
            </div>}
            <p className="material-list-price-note">Estimate only. A Material Square team member will confirm the complete price, availability, applicable taxes and delivery for your site.</p>
            {quoteItems.length > 0 && !checking && !isAuthenticated && <div className="material-list-guest-actions" aria-label="Account sign-in actions">
              <Link to="/account"><UserRound size={17} aria-hidden="true" /><span>Sign in to add your GST details</span><ArrowRight size={15} aria-hidden="true" /></Link>
              <Link to="/account"><FileText size={17} aria-hidden="true" /><span>Sign in to track quotations and orders</span><ArrowRight size={15} aria-hidden="true" /></Link>
              <small>Sign in is required to submit a quotation request.</small>
            </div>}
            {quoteItems.length > 0 ? <Link className="btn btn-orange btn-block" to="/get-quote">{!checking && !isAuthenticated ? "Sign in to request quotation" : "Request a quotation"} <ArrowRight size={16} /></Link> : items.length > 0 ? <Link className="btn btn-orange btn-block" to="/get-quote">Continue with project plan <ArrowRight size={16} /></Link> : <Link className="btn btn-orange btn-block" to="/marketplace">Browse products <ArrowRight size={16} /></Link>}
          </aside>
          <MaterialCartFinder products={products} loading={catalogueLoading} />
        </div>
      </div>
    </section>
  );
}
