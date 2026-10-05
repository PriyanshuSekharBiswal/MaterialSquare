import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList } from "lucide-react";
import MaterialListEditor from "../components/MaterialListEditor";
import { useCustomer } from "../customer";
import type { CatalogueProduct } from "../types";

export default function MaterialListPage({ products }: { products: CatalogueProduct[] }) {
  const { items } = useCustomer();
  return (
    <section className="material-list-page container">
      <nav className="product-breadcrumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span aria-current="page">Material List</span></nav>
      <Link className="product-back-link" to="/marketplace"><ArrowLeft size={16} /> Continue browsing</Link>
      <header className="material-list-page-header">
        <span className="badge-pill badge-orange-pill"><ClipboardList size={14} /> Your selected materials</span>
        <h1>Review your Material List</h1>
        <p>Check sizes and quantities for each line. The team will confirm price, stock and delivery in your quotation.</p>
      </header>
      <div className="material-list-page-grid">
        <div className="material-list-page-items"><MaterialListEditor products={products} /></div>
        <aside className="material-list-summary">
          <span>REQUEST SUMMARY</span>
          <h2>{items.length} item{items.length === 1 ? "" : "s"}</h2>
          <p>No payment is collected here. Final price, availability, tax and delivery are confirmed by the team.</p>
          {items.length > 0 ? <Link className="btn btn-orange btn-block" to="/get-quote">Continue to request <ArrowRight size={16} /></Link> : <Link className="btn btn-orange btn-block" to="/marketplace">Browse products <ArrowRight size={16} /></Link>}
        </aside>
      </div>
    </section>
  );
}
