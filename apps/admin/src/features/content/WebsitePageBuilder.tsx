import {
  websitePages,
  type WebsitePage,
  type PageSection,
  type SiteContent,
} from "@material-square/types";

export default function WebsitePageBuilder({
  content,
  disabled,
  onChange,
}: {
  content: SiteContent;
  disabled: boolean;
  onChange: (content: SiteContent) => void;
}) {
  // Parse permissively while editing so an incomplete field never discards a draft.
  let pages: WebsitePage[];
  try {
    pages = JSON.parse(content["website.pages"] || "[]");
  } catch {
    pages = websitePages(content["website.pages"]);
  }
  const save = (next: WebsitePage[]) =>
    onChange({ ...content, "website.pages": JSON.stringify(next) });
  const update = (id: string, changes: Partial<WebsitePage>) =>
    save(pages.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  function sections(page: WebsitePage, next: PageSection[]) {
    update(page.id, { sections: next });
  }
  function changeSection(
    page: WebsitePage,
    id: string,
    changes: Partial<PageSection>,
  ) {
    sections(
      page,
      page.sections.map((s) => (s.id === id ? { ...s, ...changes } : s)),
    );
  }
  function move(page: WebsitePage, index: number, offset: number) {
    const next = [...page.sections];
    const to = index + offset;
    if (to < 0 || to >= next.length) return;
    [next[index], next[to]] = [next[to], next[index]];
    sections(page, next);
  }
  return (
    <section className="panel-card panel-body">
      <h2>Website pages</h2>
      <p>
        Create pages and arrange their sections. Save a draft and preview before
        publishing website content.
      </p>
      <button
        type="button"
        disabled={disabled || pages.length >= 50}
        onClick={() => {
          const id = crypto.randomUUID();
          save([
            ...pages,
            {
              id,
              path: `/page-${id.slice(0, 8)}`,
              title: "New page",
              description: "",
              published: false,
              sections: [],
            },
          ]);
        }}
      >
        Add page
      </button>
      {pages.map((page) => (
        <fieldset
          key={page.id}
          disabled={disabled}
          className="panel-card panel-body"
        >
          <legend>{page.title || "Untitled page"}</legend>
          <label>
            Page title
            <input
              maxLength={100}
              value={page.title}
              onChange={(e) => update(page.id, { title: e.target.value })}
            />
          </label>
          <label>
            Website path
            <input
              maxLength={200}
              value={page.path}
              onChange={(e) => update(page.id, { path: e.target.value })}
            />
          </label>
          <label>
            SEO description
            <textarea
              maxLength={300}
              value={page.description}
              onChange={(e) => update(page.id, { description: e.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={page.published}
              onChange={(e) => update(page.id, { published: e.target.checked })}
            />{" "}
            Include when website content is published
          </label>
          <p>Use Preview above and select this page to review its draft.</p>
          <button
            type="button"
            disabled={pages.length >= 50}
            onClick={() =>
              save([
                ...pages,
                {
                  ...page,
                  id: crypto.randomUUID(),
                  path: `${page.path}-copy-${crypto.randomUUID().slice(0, 6)}`,
                  title: `${page.title.slice(0, 90)} (copy)`,
                  published: false,
                },
              ])
            }
          >
            Duplicate page
          </button>
          <button
            type="button"
            onClick={() => save(pages.filter((p) => p.id !== page.id))}
          >
            Delete page from draft
          </button>
          {page.sections.map((section, index) => (
            <fieldset key={section.id} className="panel-card panel-body">
              <legend>Section {index + 1}</legend>
              <label>
                Section type
                <select
                  value={section.kind}
                  onChange={(e) =>
                    changeSection(page, section.id, {
                      kind: e.target.value as PageSection["kind"],
                    })
                  }
                >
                  <option value="text">Text</option>
                  <option value="hero">Hero</option>
                  <option value="image">Image and text</option>
                  <option value="cta">Call to action</option>
                </select>
              </label>
              <label>
                Heading
                <input
                  maxLength={160}
                  value={section.title}
                  onChange={(e) =>
                    changeSection(page, section.id, { title: e.target.value })
                  }
                />
              </label>
              <label>
                Body
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={section.body}
                  onChange={(e) =>
                    changeSection(page, section.id, { body: e.target.value })
                  }
                />
              </label>
              <label>
                Image URL
                <input
                  maxLength={2000}
                  type="url"
                  value={section.imageUrl}
                  onChange={(e) =>
                    changeSection(page, section.id, {
                      imageUrl: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Image description
                <input
                  maxLength={200}
                  value={section.imageAlt}
                  onChange={(e) =>
                    changeSection(page, section.id, {
                      imageAlt: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Button label
                <input
                  maxLength={60}
                  value={section.buttonLabel}
                  onChange={(e) =>
                    changeSection(page, section.id, {
                      buttonLabel: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Button destination
                <input
                  maxLength={300}
                  value={section.buttonPath}
                  onChange={(e) =>
                    changeSection(page, section.id, {
                      buttonPath: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={section.visible}
                  onChange={(e) =>
                    changeSection(page, section.id, {
                      visible: e.target.checked,
                    })
                  }
                />{" "}
                Show section
              </label>
              <button
                type="button"
                disabled={!index}
                onClick={() => move(page, index, -1)}
              >
                Move section up
              </button>
              <button
                type="button"
                disabled={index === page.sections.length - 1}
                onClick={() => move(page, index, 1)}
              >
                Move section down
              </button>
              <button
                type="button"
                disabled={page.sections.length >= 30}
                onClick={() =>
                  sections(page, [
                    ...page.sections.slice(0, index + 1),
                    { ...section, id: crypto.randomUUID() },
                    ...page.sections.slice(index + 1),
                  ])
                }
              >
                Duplicate section
              </button>
              <button
                type="button"
                onClick={() =>
                  sections(
                    page,
                    page.sections.filter((s) => s.id !== section.id),
                  )
                }
              >
                Delete section from draft
              </button>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={page.sections.length >= 30}
            onClick={() =>
              sections(page, [
                ...page.sections,
                {
                  id: crypto.randomUUID(),
                  kind: "text",
                  title: "New section",
                  body: "",
                  imageUrl: "",
                  imageAlt: "",
                  buttonLabel: "",
                  buttonPath: "",
                  visible: true,
                },
              ])
            }
          >
            Add section
          </button>
        </fieldset>
      ))}
    </section>
  );
}
