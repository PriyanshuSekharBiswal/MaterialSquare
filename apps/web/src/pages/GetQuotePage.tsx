import type { CatalogueProduct, MaterialItem } from "../types";
import { Link } from "react-router-dom";
import MaterialListEditor from "../components/MaterialListEditor";
import RequestContactForm from "../components/RequestContactForm";
import { useSiteContent } from "../site-content";
export default function GetQuotePage(props: {
  bomList?: MaterialItem[];
  products?: CatalogueProduct[];
}) {
  const siteContent = useSiteContent();
  return (
    <section className="request-page container">
      <span className="badge-pill badge-orange-pill">
        Your site requirements
      </span>
      <h1>{siteContent["getQuote.title"]}</h1>
      <p className="request-intro">{siteContent["getQuote.description"]}</p>
      <div className="request-grid">
        <div className="request-card">
          <MaterialListEditor products={props.products} />
          <Link
            className="btn btn-secondary"
            style={{ marginTop: 20 }}
            to="/marketplace"
          >
            Browse more materials
          </Link>
        </div>
        <RequestContactForm products={props.products} />
      </div>
    </section>
  );
}
