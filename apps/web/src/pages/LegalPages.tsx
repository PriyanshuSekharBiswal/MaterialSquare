import { Link } from "react-router-dom";
import { parsePolicy } from "@material-square/types";
import { useSiteContent } from "../site-content";
function PolicyPage({ kind }: { kind: "privacy" | "terms" }) {
  const content = useSiteContent();
  const policy = parsePolicy(content[`policy.${kind}`], kind);
  const plainText = (value: string) =>
    value.replaceAll("{{contactEmail}}", content["contact.email"]);
  return (
    <article className="legal-page container">
      <span className="badge-pill">
        {kind === "privacy" ? "Privacy" : "Website terms"}
      </span>
      <h1>{policy.title}</h1>
      <p className="legal-updated">{policy.notice}</p>
      {policy.sections.map((section, index) => (
        <section key={index}>
          <h2>{section.heading}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{plainText(section.body)}</p>
        </section>
      ))}
      <Link
        className="btn btn-secondary"
        to={kind === "privacy" ? "/terms" : "/privacy"}
      >
        {kind === "privacy" ? "Read website terms" : "Read privacy notice"}
      </Link>
    </article>
  );
}
export function PrivacyPage() {
  return <PolicyPage kind="privacy" />;
}
export function TermsPage() {
  return <PolicyPage kind="terms" />;
}
