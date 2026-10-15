import type { CatalogueProduct, MaterialItem } from "../types";
import { formatQuantityUnit } from "../quantity-format";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Pencil, ShoppingBag } from "lucide-react";
import { useCustomer } from "../customer";
import RequestContactForm from "../components/RequestContactForm";
import { useSiteContent } from "../site-content";
export default function GetQuotePage(props: {
  bomList?: MaterialItem[];
  products?: CatalogueProduct[];
}) {
  const siteContent = useSiteContent();
  const { items } = useCustomer();
  const quoteItems = items.filter((item) => item.includeInQuote !== false);
  return (
    <section className="request-page container">
      <span className="badge-pill badge-orange-pill">
        Your site requirements
      </span>
      <h1>{siteContent["getQuote.title"]}</h1>
      <p className="request-intro">{siteContent["getQuote.description"]}</p>
      <div className="request-grid">
        <section className="request-card quotation-review-card" aria-labelledby="quotation-review-heading">
          <div className="quotation-review-title">
            <div><span><ClipboardList size={15} /> BEFORE YOU SEND</span><h2 id="quotation-review-heading">Items in this quotation</h2></div>
            <strong>{quoteItems.length}</strong>
          </div>
          <p>Review the options and quantities you selected. You can go back to your cart to make changes.</p>
          {quoteItems.length > 0 ? <ul className="quotation-review-list">
            {quoteItems.map((item) => {
              const product = props.products?.find((candidate) => candidate.id === (item.catalogueId || item.id));
              const description = [item.brand, item.specification || "Standard option"].filter(Boolean).join(" · ");
              return <li key={item.id}>
                <div>
                  {product ? <Link to={`/product/${encodeURIComponent(product.id)}`}>{item.name}</Link> : <strong>{item.name}</strong>}
                  <small>{description}</small>
                </div>
                <b>{formatQuantityUnit(item.quantity ?? 1, item.unit || "unit not set")}</b>
              </li>;
            })}
          </ul> : <div className="quotation-review-empty"><ShoppingBag size={20} /><span>No cart items are selected. You can still attach a project plan, or add materials first.</span></div>}
          <div className="quotation-review-actions">
            <Link className="btn btn-secondary" to="/material-list"><Pencil size={15} /> Edit cart</Link>
            <Link to="/marketplace">Browse materials <ArrowRight size={15} /></Link>
          </div>
        </section>
        <div>
          <RequestContactForm products={props.products} />
        </div>
      </div>
    </section>
  );
}
