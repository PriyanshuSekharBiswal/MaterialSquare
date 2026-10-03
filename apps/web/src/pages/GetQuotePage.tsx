import type { MaterialItem } from "../types";
import { Link } from "react-router-dom";
import MaterialListEditor from "../components/MaterialListEditor";
import RequestContactForm from "../components/RequestContactForm";
import { useCustomer } from "../customer";
import { useSiteContent } from "../site-content";
export default function GetQuotePage(_props: { bomList?: MaterialItem[] }) {
  const { error } = useCustomer();
  const siteContent = useSiteContent();
  return (
    <section className="request-page container">
      <span className="badge-pill badge-orange-pill">
        Your site requirements
      </span>
      <h1>{siteContent["getQuote.title"]}</h1>
      <p className="request-intro">
        {siteContent["getQuote.description"]}
      </p>
      {error && (
        <p className="customer-error" role="alert">
          {error}
        </p>
      )}
      <div className="request-grid">
        <div className="request-card">
          <MaterialListEditor />
          <Link
            className="btn btn-secondary"
            style={{ marginTop: 20 }}
            to="/marketplace"
          >
            Browse more materials
          </Link>
        </div>
        <RequestContactForm />
      </div>
    </section>
  );
}
