import { publicFaqEntries } from "@material-square/types";
import { useSiteContent } from "../site-content";
export default function FaqSection() {
  const content = useSiteContent();
  const entries = publicFaqEntries(content);
  if (!entries.length) return null;
  return (
    <section className="container faq-section" aria-labelledby="faq-section-title">
      <h2 id="faq-section-title">Frequently asked questions</h2>
      <div className="faq-list">
        {entries.map((entry) => (
          <details className="faq-entry" key={entry.question}>
            <summary>{entry.question}</summary>
            <div className="faq-answer"><p>{entry.answer}</p></div>
          </details>
        ))}
      </div>
    </section>
  );
}
