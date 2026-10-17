import { Link } from "react-router-dom";
import { formatContactPhone, parsePolicy, publicFaqEntries, type PolicyKind } from "@material-square/types";
import { useSiteContent } from "../site-content";
const policyTitles: Record<PolicyKind, string> = {
  privacy: "Privacy notice",
  terms: "Website terms",
  shipping: "Shipping policy",
  returns: "Return policy",
};
function PolicyPage({ kind }: { kind: PolicyKind }) {
  const content = useSiteContent();
  const policy = parsePolicy(content[`policy.${kind}`], kind);
  const plainText = (value: string) =>
    value
      .replaceAll("{{contactEmail}}", content["contact.email"])
      .replaceAll("{{contactPhone}}", formatContactPhone(content["contact.phone"]));
  if (!policy.published) {
    return (
      <article className="legal-page container">
        <span className="badge-pill">
          {policyTitles[kind]}
        </span>
        <h1>{policyTitles[kind]}</h1>
        <p>This information is being reviewed and is not published yet.</p>
        <Link className="btn btn-secondary" to="/contact">
          Contact Material Square
        </Link>
      </article>
    );
  }
  return (
    <article className="legal-page container">
      <span className="badge-pill">
        {policyTitles[kind]}
      </span>
      <h1>{policy.title}</h1>
      <p className="legal-updated">{policy.notice}</p>
      {policy.sections.map((section, index) => (
        <section key={index}>
          <h2>{section.heading}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{plainText(section.body)}</p>
        </section>
      ))}
      {kind === "privacy" && <Link className="btn btn-secondary" to="/terms">Read website terms</Link>}
      {kind === "terms" && <Link className="btn btn-secondary" to="/privacy">Read privacy notice</Link>}
      {(kind === "shipping" || kind === "returns") && <Link className="btn btn-secondary" to="/contact">Contact Material Square</Link>}
    </article>
  );
}
export function PrivacyPage() {
  return <PolicyPage kind="privacy" />;
}
export function TermsPage() {
  return <PolicyPage kind="terms" />;
}
export function ShippingPage() {
  return <PolicyPage kind="shipping" />;
}
export function ReturnPolicyPage() {
  return <PolicyPage kind="returns" />;
}
export function FaqPage() {
  const entries = publicFaqEntries(useSiteContent());
  return (
    <article className="legal-page container faq-page">
      <span className="badge-pill">Help &amp; support</span>
      <h1>Frequently asked questions</h1>
      <p className="legal-updated">Answers to common questions about products, quotations, availability and delivery.</p>
      {entries.length ? <div className="faq-list">{entries.map((entry) => (
        <details className="faq-entry" key={entry.question}>
          <summary>{entry.question}</summary>
          <div className="faq-answer"><p>{entry.answer}</p></div>
        </details>
      ))}</div> : <p>There are no published FAQs at the moment.</p>}
      <Link className="btn btn-secondary" to="/contact">Contact Material Square</Link>
    </article>
  );
}
