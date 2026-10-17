import { DEFAULT_FAQ_ENTRIES, type FaqEntry, type SiteContent } from "@material-square/types";

export default function FaqEditor({
  content,
  disabled,
  onChange,
}: {
  content: SiteContent;
  disabled: boolean;
  onChange: (value: SiteContent) => void;
}) {
  let entries: FaqEntry[] = [];
  try {
    const parsed: unknown = JSON.parse(content["faq.entries"]);
    if (Array.isArray(parsed)) entries = parsed as FaqEntry[];
  } catch {
    // Saved legacy copy has no entries.
  }
  if (!entries.length && content["faq.entries"]?.trim() === "[]") {
    if (content["faq.enabled"] !== "false") {
      entries = DEFAULT_FAQ_ENTRIES.map((entry) => ({ ...entry }));
    }
  }

  function save(next: FaqEntry[]) {
    onChange({ ...content, "faq.entries": JSON.stringify(next) });
  }

  function update(index: number, field: keyof FaqEntry, value: string) {
    save(entries.map((entry, position) => position === index ? { ...entry, [field]: value } : entry));
  }

  return (
    <section className="panel-card panel-body website-faq-editor">
      <h2>Frequently asked questions</h2>
      <p>Published entries appear on the contact page. Questions and answers are plain text.</p>
      <label className="website-editor-check-row">
        <input
          type="checkbox"
          disabled={disabled}
          checked={content["faq.enabled"] !== "false"}
          onChange={(event) => onChange({ ...content, "faq.enabled": String(event.target.checked) })}
        />
        <span>Show frequently asked questions on the contact page</span>
      </label>
      <div className="website-faq-list">
        {entries.map((entry, index) => (
          <fieldset className="website-faq-entry" key={index} disabled={disabled}>
            <legend>FAQ {index + 1}</legend>
            <label>
              Question {index + 1}
              <input required minLength={3} maxLength={200} value={entry.question} onChange={(event) => update(index, "question", event.target.value)} />
            </label>
            <label>
              Answer {index + 1}
              <textarea required minLength={3} maxLength={2000} value={entry.answer} onChange={(event) => update(index, "answer", event.target.value)} />
            </label>
            <div className="website-editor-actions-row">
              <button type="button" className="btn-sm btn-secondary" onClick={() => save(entries.filter((_, position) => position !== index))}>
                Remove FAQ {index + 1}
              </button>
            </div>
          </fieldset>
        ))}
      </div>
      <div className="website-editor-actions-row">
        <button type="button" className="btn-sm btn-secondary" disabled={disabled || entries.length >= 20} onClick={() => save([...entries, { question: "", answer: "" }])}>
          Add FAQ
        </button>
      </div>
    </section>
  );
}
