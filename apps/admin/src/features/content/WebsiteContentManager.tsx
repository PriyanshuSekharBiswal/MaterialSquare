import WebsitePageBuilder from "./WebsitePageBuilder";
import PolicyEditor from "./PolicyEditor";
import FaqEditor from "./FaqEditor";
import NavigationControls from "./NavigationControls";
import HomepageSectionControls from "./HomepageSectionControls";
import HomepageContentBlocks from "./HomepageContentBlocks";
import GuideControls from "./GuideControls";
import MediaLibrary from "./MediaLibrary";
import SocialLinksEditor from "./SocialLinksEditor";
import "./media-library.css";
import ContentImageField from "../../components/ContentImageField";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import {
  SITE_CONTENT_DEFAULTS,
  SITE_CONTENT_GROUPS,
  type SiteContent,
} from "@material-square/types";

const PREVIEW_MESSAGE = "material-square:site-content-preview";

export default function WebsiteContentManager({
  token,
  onSignOut,
  customerUrl,
}: {
  token: string;
  onSignOut: () => void;
  customerUrl: string;
}) {
  const [content, setContent] = useState<SiteContent>({
    ...SITE_CONTENT_DEFAULTS,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewPath, setPreviewPath] = useState("/");
  const [previewContent, setPreviewContent] = useState<SiteContent | null>(
    null,
  );
  const [mediaBusy, setMediaBusy] = useState(false);
  const previewFrame = useRef<HTMLIFrameElement>(null);

  const request = useCallback(
    async (
      method = "GET",
      body?: SiteContent,
      action = "draft",
    ): Promise<SiteContent> => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/${action}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(65000),
        },
      );
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not load website content.",
        );
      return result as SiteContent;
    },
    [token, onSignOut],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setContent(await request());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load website content.",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!preview || !previewContent) return;
    let targetOrigin: string;
    try {
      const configuredUrl = new URL(customerUrl);
      if (
        !["http:", "https:"].includes(configuredUrl.protocol) ||
        configuredUrl.username ||
        configuredUrl.password
      )
        return;
      targetOrigin = configuredUrl.origin;
    } catch {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== previewFrame.current?.contentWindow ||
        event.origin !== targetOrigin
      )
        return;
      if (event.data?.type !== `${PREVIEW_MESSAGE}:ready`) return;
      previewFrame.current?.contentWindow?.postMessage(
        { type: PREVIEW_MESSAGE, content: previewContent },
        targetOrigin,
      );
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [customerUrl, preview, previewContent]);

  async function save(publish = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setContent(
        await request(
          publish ? "POST" : "PUT",
          content,
          publish ? "publish" : "draft",
        ),
      );
      setNotice(
        publish
          ? "Website content published."
          : "Draft saved. The live website has not changed.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save website content.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function previewDraft() {
    if (!customerUrl) {
      setError("The customer website URL is not configured for preview.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const savedDraft = await request("PUT", content, "draft");
      setContent(savedDraft);
      setPreviewContent(savedDraft);
      setPreview(true);
      setNotice(
        "Draft saved. The customer-site preview is private and has not been published.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save the draft for preview.",
      );
    } finally {
      setBusy(false);
    }
  }

  function closePreview() {
    setPreview(false);
    setPreviewContent(null);
  }

  let previewUrl = "";
  try {
    if (customerUrl) {
      const url = new URL(customerUrl);
      if (
        ["http:", "https:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      ) {
        url.pathname = previewPath;
        url.searchParams.set("draftPreview", "1");
        previewUrl = url.toString();
      }
    }
  } catch {
    // The editor remains usable; opening preview reports the missing/invalid configuration.
  }
  const contentDisabled = busy || loading || mediaBusy;

  return (
    <div className="website-content-manager">
      <header className="staff-management-header">
        <div>
          <span className="eyebrow">PUBLIC WEBSITE</span>
          <h2>Pages & business details</h2>
          <p>
            Edit the approved page copy and contact details shown on the
            customer website. Product information is managed under Products,
            prices & offers.
          </p>
        </div>
        <div className="website-content-actions">
          <button
            className="btn-sm btn-secondary"
            type="button"
            disabled={contentDisabled}
            onClick={() => setContent({ ...SITE_CONTENT_DEFAULTS })}
          >
            <RotateCcw size={16} /> Restore draft defaults
          </button>
          <button
            className="btn-sm btn-secondary"
            type="button"
            disabled={contentDisabled}
            onClick={() => (preview ? closePreview() : void previewDraft())}
          >
            {preview ? "Close preview" : "Preview draft"}
          </button>
          <button
            className="btn-sm btn-secondary"
            type="button"
            disabled={contentDisabled}
            onClick={() => void save()}
          >
            <Save size={16} /> Save draft
          </button>
          <button
            className="btn-sm btn-primary"
            type="button"
            disabled={contentDisabled}
            onClick={() => void save(true)}
          >
            {busy ? "Saving…" : "Publish"}
          </button>
        </div>
      </header>
      {preview && previewUrl && (
        <section
          className="panel-card panel-body website-content-preview"
          aria-label="Customer website draft preview"
        >
          <div className="website-content-preview-heading">
            <div>
              <span className="eyebrow">PRIVATE DRAFT PREVIEW</span>
              <p>
                Showing the customer website with this saved draft. Publishing
                is unchanged.
              </p>
            </div>
          </div>
          <label>Preview page<select value={previewPath} onChange={event => setPreviewPath(event.target.value)}>
            <option value="/">Home</option>
            {JSON.parse(previewContent?.["website.pages"] || "[]").map((page: { id: string; path: string; title: string }) => <option key={page.id} value={page.path}>{page.title}</option>)}
          </select></label>
          <iframe
            ref={previewFrame}
            title="Customer website draft preview"
            src={previewUrl}
            referrerPolicy="origin"
            className="website-content-preview-frame"
          />
        </section>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="saved-notice" role="status">
          {notice}
        </p>
      )}
      <nav className="website-content-jump-nav" aria-label="Website settings">
        <a href="#content-pages">Pages & menus</a>
        <a href="#content-homepage">Homepage</a>
        <a href="#content-guides">Guides & FAQs</a>
        <a href="#content-contact">Contact & office</a>
        <a href="#content-images">Images</a>
        <a href="#content-privacy">Privacy & terms</a>
        <a href="#content-social">Social links</a>
        <a href="#content-metadata">SEO</a>
        <a href="#content-footer">Footer</a>
      </nav>
      <div id="content-privacy" className="website-content-anchor">
        <PolicyEditor
          kind="privacy"
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
        <PolicyEditor
          kind="terms"
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
      </div>
      <div id="content-guides" className="website-content-anchor">
        <FaqEditor
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
        <GuideControls
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
      </div>
      <div id="content-pages" className="website-content-anchor">
        <NavigationControls
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
        <WebsitePageBuilder
          content={content}
          disabled={busy || loading}
          onChange={setContent}
        />
      </div>
      <div id="content-homepage" className="website-content-anchor">
        <HomepageSectionControls
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
        <HomepageContentBlocks
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
      </div>
      <div id="content-social" className="website-content-anchor">
        <SocialLinksEditor
          content={content}
          disabled={contentDisabled}
          onChange={setContent}
        />
      </div>
      <div id="content-images" className="website-content-anchor">
        <MediaLibrary token={token} onSignOut={onSignOut} />
      </div>
      {loading ? (
        <p role="status">Loading saved website copy…</p>
      ) : (
        SITE_CONTENT_GROUPS.map((group) => (
          <section
            className="panel-card panel-body website-content-group"
            key={group.label}
            id={
              group.label === "Homepage"
                ? "content-homepage-copy"
                : group.label === "Contact & business details"
                  ? "content-contact"
                  : group.label === "Page metadata"
                    ? "content-metadata"
                    : group.label === "Footer"
                      ? "content-footer"
                      : undefined
            }
          >
            <h3>{group.label}</h3>
            <div className="website-content-fields">
              {group.fields.map(({ key, label, multiline, image }) =>
                image ? (
                  <ContentImageField
                    key={key}
                    token={token}
                    value={content[key]}
                    label={label}
                    onChange={(url) =>
                      setContent((old) => ({ ...old, [key]: url }))
                    }
                    onBusyChange={setMediaBusy}
                    onSignOut={onSignOut}
                  />
                ) : (
                  <label key={key}>
                    {label}
                    {multiline ? (
                      <textarea
                        rows={3}
                        maxLength={
                          key.startsWith("seo.")
                            ? key === "seo.description"
                              ? 300
                              : 100
                            : 2000
                        }
                        value={content[key]}
                        onChange={(event) =>
                          setContent((old) => ({
                            ...old,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    ) : (
                      <input
                        maxLength={
                          key.startsWith("seo.")
                            ? key === "seo.description"
                              ? 300
                              : 100
                            : 2000
                        }
                        value={content[key]}
                        onChange={(event) =>
                          setContent((old) => ({
                            ...old,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    )}
                  </label>
                ),
              )}
            </div>
          </section>
        ))
      )}
      <p className="website-content-note">
        Text is stored as plain text. Page layout, product images, prices and
        availability are managed separately.
      </p>
    </div>
  );
}
