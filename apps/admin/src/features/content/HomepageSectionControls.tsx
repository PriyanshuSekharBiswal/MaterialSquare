import {
  HOMEPAGE_SECTIONS,
  homepageSectionOrder,
  type SiteContent,
} from "@material-square/types";

interface HomepageSectionControlsProps {
  content: SiteContent;
  disabled: boolean;
  onChange: (content: SiteContent) => void;
}

export default function HomepageSectionControls({
  content,
  disabled,
  onChange,
}: HomepageSectionControlsProps) {
  const order = homepageSectionOrder(content["home.sectionOrder"]);
  const hidden = new Set(
    content["home.hiddenSections"].split(",").filter(Boolean),
  );

  function moveSection(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= order.length) return;

    const nextOrder = [...order];
    [nextOrder[index], nextOrder[destination]] = [
      nextOrder[destination],
      nextOrder[index],
    ];
    onChange({ ...content, "home.sectionOrder": nextOrder.join(",") });
  }

  function setSectionVisibility(id: string, isVisible: boolean) {
    const nextHidden = isVisible
      ? [...hidden].filter((hiddenId) => hiddenId !== id)
      : [...hidden, id];
    onChange({
      ...content,
      "home.hiddenSections": nextHidden.join(","),
    });
  }

  return (
    <section className="panel-card panel-body">
      <h2>Homepage sections</h2>
      <p>
        Choose which sections appear and arrange their order on the homepage.
      </p>
      <ol className="homepage-section-list">
        {order.map((id, index) => {
          const section = HOMEPAGE_SECTIONS.find((entry) => entry.id === id);
          if (!section) return null;

          return (
            <li className="homepage-section-item" key={id}>
              <label>
                <input
                  type="checkbox"
                  aria-label={`Show ${section.label}`}
                  disabled={disabled}
                  checked={!hidden.has(id)}
                  onChange={(event) =>
                    setSectionVisibility(id, event.target.checked)
                  }
                />
                {section.label}
              </label>
              <div className="website-content-actions">
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  aria-label={`Move ${section.label} up`}
                  title={`Move ${section.label} up`}
                  disabled={disabled || index === 0}
                  onClick={() => moveSection(index, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  aria-label={`Move ${section.label} down`}
                  title={`Move ${section.label} down`}
                  disabled={disabled || index === order.length - 1}
                  onClick={() => moveSection(index, 1)}
                >
                  Move down
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
