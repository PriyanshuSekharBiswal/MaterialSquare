import {
  homeContentBlocks,
  type HomeContentBlock,
  type SiteContent,
} from "@material-square/types";

interface HomepageContentBlocksProps {
  content: SiteContent;
  disabled: boolean;
  onChange: (content: SiteContent) => void;
}

const contentBlockLimit = 10;

function createContentBlock(
  title = "New information section",
): HomeContentBlock {
  return {
    id: `block-${crypto.randomUUID()}`,
    title,
    body: "Add a short description for your customers.",
    buttonLabel: "",
    buttonPath: "",
    visible: true,
  };
}

export default function HomepageContentBlocks({
  content,
  disabled,
  onChange,
}: HomepageContentBlocksProps) {
  const blocks = homeContentBlocks(content["home.contentBlocks"]);

  function save(next: HomeContentBlock[]) {
    onChange({ ...content, "home.contentBlocks": JSON.stringify(next) });
  }

  function updateBlock(index: number, changes: Partial<HomeContentBlock>) {
    save(
      blocks.map((block, current) =>
        current === index ? { ...block, ...changes } : block,
      ),
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[destination]] = [next[destination], next[index]];
    save(next);
  }

  function duplicateBlock(index: number) {
    if (blocks.length >= contentBlockLimit) return;
    const original = blocks[index];
    const duplicate = {
      ...original,
      ...createContentBlock(`${original.title} (copy)`),
      body: original.body,
      buttonLabel: original.buttonLabel,
      buttonPath: original.buttonPath,
    };
    save([
      ...blocks.slice(0, index + 1),
      duplicate,
      ...blocks.slice(index + 1),
    ]);
  }

  return (
    <section className="panel-card panel-body homepage-content-blocks">
      <header className="staff-management-header">
        <div>
          <h2>Custom homepage content</h2>
          <p>
            Add up to {contentBlockLimit} simple text sections. Content stays
            plain text, and buttons can only link to pages on this website.
          </p>
        </div>
        <button
          type="button"
          className="btn-sm btn-primary"
          disabled={disabled || blocks.length >= contentBlockLimit}
          onClick={() => save([...blocks, createContentBlock()])}
        >
          Add section
        </button>
      </header>
      {blocks.length === 0 ? (
        <p>No custom sections yet. Existing homepage sections are unchanged.</p>
      ) : (
        <ol className="homepage-section-list">
          {blocks.map((block, index) => (
            <li
              className="homepage-section-item homepage-content-block"
              key={block.id}
            >
              <div className="homepage-content-block-heading">
                <strong>{block.title || "Untitled section"}</strong>
                <div className="website-content-actions">
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={disabled || index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={disabled || index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={disabled || blocks.length >= contentBlockLimit}
                    onClick={() => duplicateBlock(index)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={disabled}
                    onClick={() =>
                      save(blocks.filter((_, item) => item !== index))
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={block.visible}
                  disabled={disabled}
                  onChange={(event) =>
                    updateBlock(index, { visible: event.target.checked })
                  }
                />
                Show this section on the homepage
              </label>
              <div className="website-content-fields">
                <label>
                  Heading
                  <input
                    value={block.title}
                    maxLength={120}
                    disabled={disabled}
                    onChange={(event) =>
                      updateBlock(index, { title: event.target.value })
                    }
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={block.body}
                    maxLength={1000}
                    rows={4}
                    disabled={disabled}
                    onChange={(event) =>
                      updateBlock(index, { body: event.target.value })
                    }
                  />
                </label>
                <label>
                  Button label (optional)
                  <input
                    value={block.buttonLabel}
                    maxLength={40}
                    disabled={disabled}
                    onChange={(event) =>
                      updateBlock(index, { buttonLabel: event.target.value })
                    }
                  />
                </label>
                <label>
                  Button page (required when a button label is set)
                  <select
                    value={block.buttonPath}
                    disabled={disabled}
                    onChange={(event) =>
                      updateBlock(index, { buttonPath: event.target.value })
                    }
                  >
                    <option value="">No button</option>
                    <option value="/">Home</option>
                    <option value="/marketplace">Products</option>
                    <option value="/get-quote">Request a quotation</option>
                    <option value="/guides">Tools &amp; guides</option>
                    <option value="/blogs">Blogs</option>
                    <option value="/experts">Experts</option>
                    <option value="/contact">Contact</option>
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
