import {
  GUIDE_TABS,
  guideTabOrder,
  type SiteContent,
} from "@material-square/types";

const guideFields = [
  {
    id: "wire",
    label: "guides.tab.wire.label",
    title: "guides.tab.wire.title",
    description: "guides.tab.wire.description",
  },
  {
    id: "plumbing",
    label: "guides.tab.plumbing.label",
    title: "guides.tab.plumbing.title",
    description: "guides.tab.plumbing.description",
  },
  {
    id: "storage",
    label: "guides.tab.storage.label",
    title: "guides.tab.storage.title",
    description: "guides.tab.storage.description",
  },
] as const;

export default function GuideControls({
  content,
  disabled,
  onChange,
}: {
  content: SiteContent;
  disabled: boolean;
  onChange: (value: SiteContent) => void;
}) {
  const order = guideTabOrder(content["guides.tabOrder"]);
  const hidden = content["guides.hiddenTabs"].split(",").filter(Boolean);

  return (
    <section className="panel-card panel-body">
      <h2>Tools & Guides sections</h2>
      <p>
        Rename, reorder, hide, and edit the introduction for each guide. The
        professional verification notice stays visible on the public page.
      </p>
      {order.map((id, index) => {
        const fields = guideFields.find((entry) => entry.id === id)!;
        const tab = GUIDE_TABS.find((entry) => entry.id === id)!;
        const isVisible = !hidden.includes(id);
        const changeField = (
          key: (typeof fields)[keyof typeof fields],
          value: string,
        ) => onChange({ ...content, [key]: value });
        return (
          <div className="website-content-fields" key={id}>
            <h3>{tab.label}</h3>
            <label>
              Label for {id} guide
              <input
                maxLength={80}
                required
                disabled={disabled}
                value={content[fields.label]}
                onChange={(event) =>
                  changeField(fields.label, event.target.value)
                }
              />
            </label>
            <label>
              Heading for {id} guide
              <input
                maxLength={160}
                required
                disabled={disabled}
                value={content[fields.title]}
                onChange={(event) =>
                  changeField(fields.title, event.target.value)
                }
              />
            </label>
            <label>
              Introduction for {id} guide
              <textarea
                rows={3}
                maxLength={800}
                required
                disabled={disabled}
                value={content[fields.description]}
                onChange={(event) =>
                  changeField(fields.description, event.target.value)
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                aria-label={`Show ${id} guide in Tools`}
                disabled={
                  disabled ||
                  (isVisible && hidden.length === GUIDE_TABS.length - 1)
                }
                checked={isVisible}
                onChange={(event) =>
                  onChange({
                    ...content,
                    "guides.hiddenTabs": (event.target.checked
                      ? hidden.filter((value) => value !== id)
                      : [...hidden, id]
                    ).join(","),
                  })
                }
              />{" "}
              Show this guide
            </label>
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={disabled || index === 0}
              onClick={() => {
                const next = [...order];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange({ ...content, "guides.tabOrder": next.join(",") });
              }}
            >
              Move {id} guide up
            </button>
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={disabled || index === order.length - 1}
              onClick={() => {
                const next = [...order];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                onChange({ ...content, "guides.tabOrder": next.join(",") });
              }}
            >
              Move {id} guide down
            </button>
          </div>
        );
      })}
      <label>
        Tools closing heading
        <input
          maxLength={160}
          required
          disabled={disabled}
          value={content["guides.callout.title"]}
          onChange={(event) =>
            onChange({ ...content, "guides.callout.title": event.target.value })
          }
        />
      </label>
      <label>
        Tools closing text
        <textarea
          rows={3}
          maxLength={800}
          required
          disabled={disabled}
          value={content["guides.callout.description"]}
          onChange={(event) =>
            onChange({
              ...content,
              "guides.callout.description": event.target.value,
            })
          }
        />
      </label>
    </section>
  );
}
