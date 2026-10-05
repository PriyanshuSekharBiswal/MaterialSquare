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
    <section className="panel-card panel-body">
      <h2>{kind === "privacy" ? "Privacy notice" : "Website terms"}</h2>
      <p>
        Review the final copy with the client before publication. Use{" "}
        {"{{contactEmail}}"} to include the published contact email.
      </p>
      <fieldset disabled={disabled}>
        <label>
          {kind} page heading
          <input
            maxLength={200}
            value={policy.title}
            onChange={(event) => save({ ...policy, title: event.target.value })}
          />
        </label>
        <label>
          {kind} publication note
          <input
            maxLength={300}
            value={policy.notice}
            onChange={(event) =>
              save({ ...policy, notice: event.target.value })
            }
          />
        </label>
        {policy.sections.map((section, index) => (
          <div className="website-content-fields" key={index}>
            <label>
              {kind} section {index + 1} heading
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
              {kind} section {index + 1} text
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
              Move {kind} section {index + 1} up
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
              Remove {kind} section {index + 1}
            </button>
          </div>
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
          Add {kind} section
        </button>
        <label>
          {kind} review note
          <textarea
            maxLength={2000}
            value={policy.reviewNote}
            onChange={(event) =>
              save({ ...policy, reviewNote: event.target.value })
            }
          />
        </label>
      </fieldset>
    </section>
  );
}
