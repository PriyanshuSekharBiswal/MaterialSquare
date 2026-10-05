import { parseFaqEntries } from "@material-square/types";
import { useSiteContent } from "../site-content";
export default function FaqSection() {
  const content = useSiteContent();
  const entries = parseFaqEntries(content["faq.entries"]);
  if (!entries.length) return null;
  return <section className="container" style={{ paddingBlock: "48px" }}><h2>Frequently asked questions</h2>{entries.map((entry,index) => <details key={index} style={{ padding: "16px 0", borderBottom: "1px solid #e2e8f0" }}><summary>{entry.question}</summary><p style={{ whiteSpace:"pre-line" }}>{entry.answer}</p></details>)}</section>;
}
