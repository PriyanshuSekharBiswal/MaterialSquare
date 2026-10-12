import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import MaterialListEditor from "../components/MaterialListEditor";
import MaterialCartFinder from "../components/MaterialCartFinder";
import { useCustomer } from "../customer";
import type { CatalogueProduct } from "../types";

export default function MaterialListPage({ products, catalogueLoading = false }: { products: CatalogueProduct[]; catalogueLoading?: boolean }) {
  const { items } = useCustomer();
  const quoteItems = items.filter((item) => item.includeInQuote !== false);
  const productCount = new Set(quoteItems.map((item) => item.catalogueId || item.id)).size;
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
            <p>Your other cart items stay here. The team will confirm price, availability, tax and delivery for selected items.</p>
            {quoteItems.length > 0 ? <Link className="btn btn-orange btn-block" to="/get-quote">Request a quotation <ArrowRight size={16} /></Link> : items.length > 0 ? <Link className="btn btn-orange btn-block" to="/get-quote">Continue with project plan <ArrowRight size={16} /></Link> : <Link className="btn btn-orange btn-block" to="/marketplace">Browse products <ArrowRight size={16} /></Link>}
          </aside>
          <MaterialCartFinder products={products} loading={catalogueLoading} />
        </div>
      </div>
    </section>
  );
}
