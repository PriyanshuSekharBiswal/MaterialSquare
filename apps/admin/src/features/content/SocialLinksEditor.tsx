import {
  parseSocialLinks,
  type SiteContent,
  type SocialLink,
} from "@material-square/types";

interface SocialLinksEditorProps {
  content: SiteContent;
  disabled: boolean;
  onChange: (content: SiteContent) => void;
}

export default function SocialLinksEditor({
  content,
  disabled,
  onChange,
}: SocialLinksEditorProps) {
  const links = parseSocialLinks(content["footer.socialLinks"]);

  function save(next: SocialLink[]) {
    onChange({ ...content, "footer.socialLinks": JSON.stringify(next) });
  }

  function updateLink(id: string, patch: Partial<SocialLink>) {
    save(links.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  }

  return (
    <section className="panel-card panel-body">
      <h2>Social links</h2>
      <p>Manage the external social links shown in the website footer.</p>
      {links.map((link, index) => (
        <fieldset
          className="social-link-editor"
          key={link.id}
          disabled={disabled}
        >
          <legend>Social link {index + 1}</legend>
          <label>
            Link label
            <input
              required
              maxLength={60}
              value={link.label}
              onChange={(event) =>
                updateLink(link.id, { label: event.target.value })
              }
            />
          </label>
          <label>
            HTTPS address
            <input
              required
              type="url"
              maxLength={2048}
              value={link.url}
              onChange={(event) =>
                updateLink(link.id, { url: event.target.value })
              }
            />
          </label>
          <button
            type="button"
            className="btn-sm btn-secondary"
            onClick={() => save(links.filter((entry) => entry.id !== link.id))}
          >
            Remove social link {index + 1}
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="btn-sm btn-secondary"
        disabled={disabled || links.length >= 8}
        onClick={() =>
          save([
            ...links,
            {
              id: `social-${crypto.randomUUID()}`,
              label: "Follow us",
              url: "https://example.com",
            },
          ])
        }
      >
        Add social link
      </button>
    </section>
  );
}
