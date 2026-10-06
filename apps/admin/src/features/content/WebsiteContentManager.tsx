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
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { Clock3, RotateCcw, Save, RotateCw } from "lucide-react";
import {
  SITE_CONTENT_DEFAULTS,
  SITE_CONTENT_GROUPS,
  type SiteContent,
} from "@material-square/types";

const PREVIEW_MESSAGE = "material-square:site-content-preview";
const RECOVERY_KEY = "material-square-website-content-recovery-v1";
const RECOVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type RecoveryPoint = {
  id: string;
  changedFields: unknown;
  saveType: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  staff: { name: string; role: string } | null;
};

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
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasServerDraft, setHasServerDraft] = useState(false);
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [restoringId, setRestoringId] = useState("");
  const [browserRecovery, setBrowserRecovery] = useState<SiteContent | null>(null);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const hydrated = useRef(false);
  const lastSavedContent = useRef("");
  const currentContent = useRef(content);
  currentContent.current = content;
  const previewedContent = useRef("");
  const autosaveQueue = useRef(Promise.resolve());

  const request = useCallback(
    async (
      method = "GET",
      body?: SiteContent,
      action = "draft",
      mode?: "autosave" | "manual",
    ): Promise<SiteContent> => {
      const suffix = mode ? `?mode=${mode}` : "";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/${action}${suffix}`,
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
      const serverDraft = await request();
      const statusResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/draft/status`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(65000) },
      );
      const draftStatus = statusResponse.ok ? await statusResponse.json() as { updatedAt: string | null } : { updatedAt: null };
      let restored = serverDraft;
      try {
        const local = JSON.parse(localStorage.getItem(RECOVERY_KEY) || "null") as
          | { content?: SiteContent; savedAt?: number }
          | null;
        const localIsFresh = !!local?.content && Number(local.savedAt) > 0 && Date.now() - Number(local.savedAt) < RECOVERY_WINDOW_MS;
        const localIsNewer = !draftStatus.updatedAt || Number(local?.savedAt) > Date.parse(draftStatus.updatedAt);
        if (localIsFresh && localIsNewer && JSON.stringify(local.content) !== JSON.stringify(serverDraft)) {
          restored = local.content as SiteContent;
          setNotice("Recovered unsaved website edits from this browser. They are being saved as a private draft.");
        } else if (localIsFresh && !localIsNewer && JSON.stringify(local.content) !== JSON.stringify(serverDraft)) {
          setBrowserRecovery(local.content as SiteContent);
          setNotice("A newer shared draft is already saved. The older browser recovery copy was kept from replacing it.");
        } else if (!localIsFresh) {
          localStorage.removeItem(RECOVERY_KEY);
        }
      } catch {
        localStorage.removeItem(RECOVERY_KEY);
      }
      setContent(restored);
      lastSavedContent.current = JSON.stringify(serverDraft);
      hydrated.current = true;
      setHasServerDraft(!!draftStatus.updatedAt);
      setLastSavedAt(draftStatus.updatedAt ? new Date(draftStatus.updatedAt) : null);
      setSaveState("saved");
      const historyResponse = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/draft/history`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(65000) },
      );
      if (historyResponse.ok) setRecoveryPoints(await historyResponse.json() as RecoveryPoint[]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load website content.",
      );
    } finally {
      setLoading(false);
    }
  }, [request, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateContent = useCallback((value: SetStateAction<SiteContent>) => {
    setContent(value);
    previewedContent.current = "";
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const serialized = JSON.stringify(content);
    if (serialized === lastSavedContent.current) return;
    try {
      localStorage.setItem(RECOVERY_KEY, JSON.stringify({ content, savedAt: Date.now() }));
    } catch {
      // The server autosave still runs when browser storage is unavailable.
    }
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const snapshot = { ...content };
      const save = autosaveQueue.current.then(async () => {
        const saved = await request("PUT", snapshot, "draft", "autosave");
        const savedJson = JSON.stringify(saved);
        lastSavedContent.current = savedJson;
        setLastSavedAt(new Date());
        setHasServerDraft(true);
        const currentJson = JSON.stringify(currentContent.current);
        setSaveState(currentJson === savedJson ? "saved" : "saving");
        if (currentJson === savedJson) {
          setError("");
          try { localStorage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }
        }
        const historyResponse = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/draft/history`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (historyResponse.ok) setRecoveryPoints(await historyResponse.json() as RecoveryPoint[]);
      });
      autosaveQueue.current = save.catch((cause) => {
        setSaveState("error");
        setError(cause instanceof Error ? cause.message : "Automatic save failed. Your browser recovery copy is still available.");
      });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [content, request, token]);

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
    if (publish && previewedContent.current !== JSON.stringify(content)) {
      setError("Save and preview the current draft before publishing it.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await autosaveQueue.current;
      setContent(
        await request(
          publish ? "POST" : "PUT",
          content,
          publish ? "publish" : "draft",
        ),
      );
      lastSavedContent.current = JSON.stringify(content);
      setLastSavedAt(new Date());
      setHasServerDraft(true);
      setSaveState("saved");
      if (!publish) {
        try { localStorage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }
      }
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
      await autosaveQueue.current;
      const savedDraft = await request("PUT", content, "draft");
      setContent(savedDraft);
      lastSavedContent.current = JSON.stringify(savedDraft);
      setLastSavedAt(new Date());
      setHasServerDraft(true);
      setSaveState("saved");
      try { localStorage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }
      setPreviewContent(savedDraft);
      setPreview(true);
      previewedContent.current = JSON.stringify(savedDraft);
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

  async function restoreRecoveryPoint(id: string) {
    setRestoringId(id);
    setError("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/draft/restore/${encodeURIComponent(id)}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Could not restore that recovery point.");
      const restored = result as SiteContent;
      setContent(restored);
      lastSavedContent.current = JSON.stringify(restored);
      setLastSavedAt(new Date());
      setHasServerDraft(true);
      setSaveState("saved");
      previewedContent.current = "";
      setNotice("Recovery point restored as a private draft. Preview it before publishing.");
      const historyResponse = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/site-content/draft/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (historyResponse.ok) setRecoveryPoints(await historyResponse.json() as RecoveryPoint[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore that recovery point.");
    } finally {
      setRestoringId("");
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
            onClick={() => updateContent({ ...SITE_CONTENT_DEFAULTS })}
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
      <section className={`website-content-save-status is-${saveState}`} aria-live="polite">
        <div><Clock3 size={17} /><strong>{saveState === "saving" ? "Saving your draft…" : saveState === "error" ? "Automatic save needs attention" : "Draft saved privately"}</strong></div>
        <span>{saveState === "saved" && lastSavedAt ? `Last saved ${lastSavedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : saveState === "error" ? "Your browser keeps a recovery copy for up to 7 days." : hasServerDraft ? "Edits are saved automatically. Recovery points are kept for 7 days." : "No private draft yet. New edits save automatically and stay recoverable for 7 days."}</span>
        {browserRecovery && <button className="btn-sm btn-secondary" type="button" disabled={contentDisabled} onClick={() => { updateContent(browserRecovery); setBrowserRecovery(null); setNotice("Browser recovery copy selected. Saving it as the current private draft."); }}>Restore this browser copy</button>}
        {recoveryPoints.length > 0 && <details className="website-content-history">
          <summary>{recoveryPoints.length} recent recovery {recoveryPoints.length === 1 ? "point" : "points"}</summary>
          <ul>{recoveryPoints.map((point) => {
            const fields = Array.isArray(point.changedFields) ? point.changedFields.filter((field): field is string => typeof field === "string") : [];
            return <li key={point.id}>
              <div><strong>{new Date(point.updatedAt).toLocaleString("en-IN")}</strong><small>{point.staff?.name || "Former staff"} · {point.saveType === "MANUAL" ? "Manual save" : "Automatic save"}</small><small>{fields.slice(0, 4).join(", ")}{fields.length > 4 ? ` +${fields.length - 4} more` : ""}</small></div>
              <button className="btn-sm btn-secondary" type="button" disabled={contentDisabled || restoringId !== "" || saveState === "saving"} onClick={() => void restoreRecoveryPoint(point.id)}>{restoringId === point.id ? "Restoring…" : <><RotateCw size={14} /> Restore</>}</button>
            </li>;
          })}</ul>
        </details>}
      </section>
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
          onChange={updateContent}
        />
        <PolicyEditor
          kind="terms"
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
        />
      </div>
      <div id="content-guides" className="website-content-anchor">
        <FaqEditor
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
        />
        <GuideControls
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
        />
      </div>
      <div id="content-pages" className="website-content-anchor">
        <NavigationControls
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
        />
        <WebsitePageBuilder
          content={content}
          disabled={busy || loading}
          onChange={updateContent}
        />
      </div>
      <div id="content-homepage" className="website-content-anchor">
        <HomepageSectionControls
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
        />
        <HomepageContentBlocks
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
        />
      </div>
      <div id="content-social" className="website-content-anchor">
        <SocialLinksEditor
          content={content}
          disabled={contentDisabled}
          onChange={updateContent}
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
                      updateContent((old) => ({ ...old, [key]: url }))
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
                          updateContent((old) => ({
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
                          updateContent((old) => ({
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
