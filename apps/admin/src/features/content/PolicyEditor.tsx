import {
  DEFAULT_POLICIES,
  type SiteContent,
  type WebsitePolicy,
} from "@material-square/types";
export default function PolicyEditor({
  kind,
  content,
  disabled,
  onChange,
}: {
  kind: "privacy" | "terms";
  content: SiteContent;
  disabled: boolean;
  onChange: (content: SiteContent) => void;
}) {
  let policy = DEFAULT_POLICIES[kind];
  try {
    const draft: unknown = JSON.parse(content[`policy.${kind}`]);
    if (
      draft &&
      typeof draft === "object" &&
      "title" in draft &&
      typeof draft.title === "string" &&
      "notice" in draft &&
      typeof draft.notice === "string" &&
      "published" in draft &&
      typeof draft.published === "boolean" &&
      "reviewNote" in draft &&
      typeof draft.reviewNote === "string" &&
      "sections" in draft &&
      Array.isArray(draft.sections) &&
      draft.sections.every(
        (section) =>
          section &&
          typeof section.heading === "string" &&
          typeof section.body === "string",
      )
    )
      policy = draft as WebsitePolicy;
  } catch {
    /* Use existing copy if saved content is malformed. */
  }

  function save(value: WebsitePolicy) {
    onChange({ ...content, [`policy.${kind}`]: JSON.stringify(value) });
  }
  return (
    <section className="panel-card panel-body website-policy-editor">
      <header className="website-policy-header">
        <div>
          <span className="eyebrow">POLICIES</span>
          <h2>{kind === "privacy" ? "Privacy notice" : "Website terms"}</h2>
          <p>
            Edit the copy shown to visitors. Use {"{{contactEmail}}"} to insert
            the published contact email.
          </p>
        </div>
        <span className={`website-policy-status ${policy.published ? "is-published" : "is-draft"}`}>
          {policy.published ? "Visible on website" : "Draft only"}
        </span>
      </header>
      <fieldset className="website-policy-fields" disabled={disabled}>
        <div className="website-policy-basics website-content-fields">
        <label>
          Page title
          <input
            maxLength={200}
            value={policy.title}
            onChange={(event) => save({ ...policy, title: event.target.value })}
          />
        </label>
        <label>
          Introductory note
          <input
            maxLength={300}
            value={policy.notice}
            onChange={(event) =>
              save({ ...policy, notice: event.target.value })
            }
          />
        </label>
        </div>
        {policy.sections.map((section, index) => (
          <section className="website-content-fields website-policy-section" key={index}>
            <div className="website-policy-section-heading">
              <h3>Section {index + 1}</h3>
              <span>{section.heading.trim() || "Add a section title"}</span>
            </div>
            <label>
              Section title
              <input
                maxLength={200}
                value={section.heading}
                onChange={(event) =>
                  save({
                    ...policy,
                    sections: policy.sections.map((value, position) =>
                      position === index
                        ? { ...value, heading: event.target.value }
                        : value,
                    ),
                  })
                }
              />
            </label>
            <label>
              Section content
              <textarea
                rows={5}
                maxLength={4000}
                value={section.body}
                onChange={(event) =>
                  save({
                    ...policy,
                    sections: policy.sections.map((value, position) =>
                      position === index
                        ? { ...value, body: event.target.value }
                        : value,
                    ),
                  })
                }
              />
            </label>
            <div className="website-policy-actions">
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={index === 0}
              onClick={() => {
                const sections = [...policy.sections];
                [sections[index - 1], sections[index]] = [
                  sections[index],
                  sections[index - 1],
                ];
                save({ ...policy, sections });
              }}
            >
              Move section up
            </button>
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={policy.sections.length === 1}
              onClick={() =>
                save({
                  ...policy,
                  sections: policy.sections.filter(
                    (_, position) => position !== index,
                  ),
                })
              }
            >
              Remove section
            </button>
            </div>
          </section>
        ))}
        <button
          type="button"
          className="btn-sm btn-secondary"
          disabled={policy.sections.length >= 20}
          onClick={() =>
            save({
              ...policy,
              sections: [...policy.sections, { heading: "", body: "" }],
            })
          }
        >
          Add section
        </button>
        <div className="website-policy-publish">
        <label className="website-policy-publish-toggle">
          <input
            type="checkbox"
            checked={policy.published}
            onChange={(event) =>
              save({ ...policy, published: event.target.checked })
            }
          />
          Show this {kind === "privacy" ? "privacy notice" : "website terms"} on the website
        </label>
        <small>Only publish copy approved by the client. Draft content stays private.</small>
        <label className="website-policy-review-note">
          Internal review note <span>Only visible to your team</span>
          <textarea
            maxLength={2000}
            value={policy.reviewNote}
            onChange={(event) =>
              save({ ...policy, reviewNote: event.target.value })
            }
          />
        </label>
        </div>
      </fieldset>
    </section>
  );
}
