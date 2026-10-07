import {
  CustomNavigationSchema,
  PUBLIC_NAVIGATION,
  type SiteContent,
} from "@material-square/types";

export default function NavigationControls({
  content,
  disabled,
  onChange,
}: {
  content: SiteContent;
  disabled: boolean;
  onChange: (value: SiteContent) => void;
}) {
  let customResult: ReturnType<typeof CustomNavigationSchema.safeParse>;
  try {
    customResult = CustomNavigationSchema.safeParse(
      JSON.parse(content["navigation.custom"] || "[]"),
    );
  } catch {
    customResult = CustomNavigationSchema.safeParse([]);
  }
  const custom = customResult.success ? customResult.data : [];
  const entries = [...PUBLIC_NAVIGATION, ...custom];
  const ids = entries.map((entry) => entry.id);
  const order = [
    ...new Set([
      ...content["navigation.order"]
        .split(",")
        .filter((id) => ids.includes(id)),
      ...ids,
    ]),
  ];
  const hidden = content["navigation.hidden"].split(",").filter(Boolean);
  const saveCustom = (next: typeof custom) =>
    onChange({ ...content, "navigation.custom": JSON.stringify(next) });

  return (
    <section className="panel-card panel-body">
      <h2>Public navigation</h2>
      <p>
        Manage links in both desktop and mobile menus. Site paths and HTTPS
        destinations are supported. Hiding a link keeps its page available.
      </p>
      {order.map((id, index) => {
        const builtin = PUBLIC_NAVIGATION.find((entry) => entry.id === id);
        const customEntry = custom.find((entry) => entry.id === id);
        const label = builtin
          ? content[`navigation.${builtin.id}`]
          : customEntry?.label;
        if (!label) return null;
        return (
          <article key={id} className="website-navigation-item">
            <header className="website-navigation-item-heading">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{label}</strong>
              <small>{hidden.includes(id) ? "Hidden from menu" : "Visible in menu"}</small>
            </header>
            <div className="website-content-fields website-navigation-item-fields">
            {builtin ? (
              <label>
                Menu label
                <input
                  maxLength={40}
                  required
                  disabled={disabled}
                  value={label}
                  onChange={(event) =>
                    onChange({
                      ...content,
                      [`navigation.${builtin.id}`]: event.target.value,
                    })
                  }
                />
              </label>
            ) : (
              <>
                <label>
                  Custom menu label
                  <input
                    maxLength={40}
                    required
                    disabled={disabled}
                    value={customEntry!.label}
                    onChange={(event) =>
                      saveCustom(
                        custom.map((entry) =>
                          entry.id === id
                            ? { ...entry, label: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Site path or HTTPS URL
                  <input
                    type="text"
                    inputMode="url"
                    maxLength={2048}
                    required
                    disabled={disabled}
                    value={customEntry!.url}
                    onChange={(event) =>
                      saveCustom(
                        custom.map((entry) =>
                          entry.id === id
                            ? { ...entry, url: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </label>
              </>
            )}
            <label className="website-navigation-visibility">
              <input
                type="checkbox"
                disabled={disabled}
                checked={!hidden.includes(id)}
                onChange={(event) =>
                  onChange({
                    ...content,
                    "navigation.hidden": (event.target.checked
                      ? hidden.filter((value) => value !== id)
                      : [...hidden, id]
                    ).join(","),
                  })
                }
              />
              Show this link in the website menu
            </label>
            </div>
            <div className="website-navigation-item-actions">
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={disabled || index === 0}
              onClick={() => {
                const next = [...order];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange({ ...content, "navigation.order": next.join(",") });
              }}
            >
              Move up
            </button>
            {customEntry && (
              <button
                type="button"
                className="btn-sm btn-secondary"
                disabled={disabled}
                onClick={() => {
                  onChange({
                    ...content,
                    "navigation.custom": JSON.stringify(
                      custom.filter((entry) => entry.id !== id),
                    ),
                    "navigation.order": order
                      .filter((value) => value !== id)
                      .join(","),
                    "navigation.hidden": hidden
                      .filter((value) => value !== id)
                      .join(","),
                  });
                }}
              >
                Remove link
              </button>
            )}
            </div>
          </article>
        );
      })}
      <button
        type="button"
        className="btn-sm btn-secondary"
        disabled={disabled || custom.length >= 10}
        onClick={() => {
          const id = `custom-${crypto.randomUUID()}`;
          onChange({
            ...content,
            "navigation.custom": JSON.stringify([
              ...custom,
              { id, label: "New link", url: "/" },
            ]),
            "navigation.order": [...order, id].join(","),
          });
        }}
      >
        Add custom link
      </button>
    </section>
  );
}
