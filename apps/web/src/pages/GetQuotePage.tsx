import type { MaterialItem } from "../types";
import { Link } from "react-router-dom";
import MaterialListEditor from "../components/MaterialListEditor";
import RequestContactForm from "../components/RequestContactForm";
export default function GetQuotePage(_props: { bomList?: MaterialItem[] }) {
  return (
    <section className="request-page container">
      <span className="badge-pill badge-orange-pill">
        Your site requirements
      </span>
      <h1>Request a material quotation</h1>
      <p className="request-intro">
        Build your material list and add your delivery details. Continue the
        conversation with our team directly through WhatsApp or email.
      </p>
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
