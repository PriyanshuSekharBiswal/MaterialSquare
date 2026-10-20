import WebsitePageBuilder from "./WebsitePageBuilder";
import PolicyEditor from "./PolicyEditor";
import FaqEditor from "./FaqEditor";
import NavigationControls from "./NavigationControls";
import HomepageSectionControls from "./HomepageSectionControls";
import HomepageContentBlocks from "./HomepageContentBlocks";
import GuideControls from "./GuideControls";
import SocialLinksEditor from "./SocialLinksEditor";
import ContentImageField from "../../components/ContentImageField";
import HomepageCategoryImages from "./HomepageCategoryImages";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { AlertTriangle, ArrowLeft, Clock3, ContactRound, Files, House, Menu, PanelBottom, RotateCcw, Save, RotateCw, Search, ShieldCheck, CircleQuestionMark, Trash2, X } from "lucide-react";
import {
  SITE_CONTENT_DEFAULTS,
  SITE_CONTENT_GROUPS,
  type SiteContent,
} from "@material-square/types";

const PREVIEW_MESSAGE = "material-square:site-content-preview";
const RECOVERY_KEY = "material-square-website-content-recovery-v1";
const WEBSITE_SECTION_KEY = "material-square-website-editor-section";
const WEBSITE_SECTION_IDS = [
  "content-pages", "content-homepage", "content-guides", "content-contact",
  "content-privacy", "content-metadata", "content-footer",
];
const WEBSITE_SECTION_ITEMS = [
  ["content-pages", "Pages & menus", Files], ["content-homepage", "Homepage", House], ["content-guides", "Guides & FAQs", CircleQuestionMark],
  ["content-contact", "Business details", ContactRound], ["content-privacy", "Policies", ShieldCheck],
  ["content-metadata", "Search & SEO", Search], ["content-footer", "Footer", PanelBottom],
] as const;
const readSavedWebsiteSection = () => {
  if (typeof window === "undefined") return "content-pages";
  try {
    const savedSection = window.localStorage.getItem(WEBSITE_SECTION_KEY);
    if (savedSection === "content-social") return "content-contact";
    return savedSection && WEBSITE_SECTION_IDS.includes(savedSection) ? savedSection : "content-pages";
  } catch {
    return "content-pages";
  }
};
const RECOVERY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const isUserCancelled = (cause: unknown) => cause instanceof DOMException && cause.name === "AbortError";
const BUILT_IN_PREVIEW_PAGES = [
  { path: "/marketplace", title: "Marketplace" },
  { path: "/why-us", title: "Why Us" },
  { path: "/guides", title: "Tools & Guides" },
  { path: "/get-quote", title: "Get Quote" },
  { path: "/contact", title: "Contact" },
  { path: "/blogs", title: "Blogs" },
  { path: "/experts", title: "Experts" },
  { path: "/privacy", title: "Privacy" },
  { path: "/terms", title: "Terms" },
];

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
  const [activeContentSection, setActiveContentSection] = useState(readSavedWebsiteSection);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"publish" | "discard" | "defaults" | null>(null);
  const sectionMenuRef = useRef<HTMLDivElement>(null);
  const restoringSection = useRef(true);
  const previewFrame = useRef<HTMLIFrameElement>(null);
  const hydrated = useRef(false);
  const lastSavedContent = useRef("");
  const currentContent = useRef(content);
  currentContent.current = content;
  const previewedContent = useRef("");
  const autosaveQueue = useRef(Promise.resolve());

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const renderContentGroups = (labels: string[]) => {
    if (loading) return <p role="status">Loading saved website copy…</p>;
    return SITE_CONTENT_GROUPS.filter((group) => labels.includes(group.label)).map((group) => (
      <section className="panel-card panel-body website-content-group" key={group.label}>
        <h3>{group.label}</h3>
        <div className="website-content-fields">
          {group.fields.map(({ key, label, multiline, image }) => image ? (
            <ContentImageField
              key={key}
              token={token}
              customerUrl={customerUrl}
              value={content[key]}
              label={label}
              recommendedSize="1200 × 800 px (3:2)"
              onChange={(url) => updateContent((old) => ({ ...old, [key]: url }))}
              onBusyChange={setMediaBusy}
              onSignOut={onSignOut}
            />
          ) : (
            <label key={key}>
              {label}
              {multiline ? (
                <textarea
                  rows={3}
                  maxLength={key.startsWith("seo.") ? (key === "seo.description" ? 300 : 100) : 2000}
                  value={content[key]}
                  onChange={(event) => updateContent((old) => ({ ...old, [key]: event.target.value }))}
                />
              ) : (
                <input
                  maxLength={key.startsWith("seo.") ? (key === "seo.description" ? 300 : 100) : 2000}
                  value={content[key]}
                  onChange={(event) => updateContent((old) => ({ ...old, [key]: event.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      </section>
    ));
  };

  useEffect(() => {
    if (restoringSection.current) return;
    try {
      window.localStorage.setItem(WEBSITE_SECTION_KEY, activeContentSection);
    } catch {
      // Section memory is a convenience; the editor remains usable if storage is unavailable.
    }
  }, [activeContentSection]);

  useEffect(() => {
    if (loading) return;
    const savedSection = readSavedWebsiteSection();
    setActiveContentSection(savedSection);
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
      window.requestAnimationFrame(() => {
        restoringSection.current = false;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);

  useEffect(() => {
    if (!sectionMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!sectionMenuRef.current?.contains(event.target as Node)) setSectionMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSectionMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [sectionMenuOpen]);

  useEffect(() => {
    if (!confirmAction) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmAction(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirmAction]);

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
    setSaveState("saving");
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
      if (isUserCancelled(e)) {
        setSaveState(JSON.stringify(content) === lastSavedContent.current ? "saved" : "saving");
        return;
      }
      setSaveState("error");
      setError(
        e instanceof Error ? e.message : "Could not save website content.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function discardDraft() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await autosaveQueue.current;
      const published = await request("DELETE", undefined, "draft");
      lastSavedContent.current = JSON.stringify(published);
      setContent(published);
      setHasServerDraft(false);
      setLastSavedAt(null);
      setSaveState("saved");
      setBrowserRecovery(null);
      setPreview(false);
      setPreviewContent(null);
      previewedContent.current = "";
      try { localStorage.removeItem(RECOVERY_KEY); } catch { /* ignore */ }
      setNotice("Unpublished draft discarded. The live website was not changed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not discard the website draft.");
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
    setSaveState("saving");
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
      if (isUserCancelled(e)) {
        setSaveState(JSON.stringify(content) === lastSavedContent.current ? "saved" : "saving");
        return;
      }
      setSaveState("error");
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
      if (isUserCancelled(cause)) return;
      setError(cause instanceof Error ? cause.message : "Could not restore that recovery point.");
    } finally {
      setRestoringId("");
    }
  }

  function closePreview() {
    setPreview(false);
    setPreviewContent(null);
  }

  function confirmPendingAction() {
    const action = confirmAction;
    setConfirmAction(null);
    setError("");
    if (action === "publish") void save(true);
    if (action === "discard") void discardDraft();
    if (action === "defaults") {
      updateContent({ ...SITE_CONTENT_DEFAULTS });
      setNotice("Default website copy restored as a private draft. Save or publish when ready.");
    }
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
            Edit approved page copy and contact details shown on your website.
            Manage product details and prices under Products & pricing.
          </p>
        </div>
        <div className="website-content-actions">
          <button
            className="btn-sm btn-secondary btn-orange-outline"
            type="button"
            disabled={contentDisabled}
            onClick={() => setConfirmAction("defaults")}
          >
            <RotateCcw size={16} /> Restore draft defaults
          </button>
          <button
            className="btn-sm btn-secondary btn-orange-outline"
            type="button"
            disabled={contentDisabled}
            onClick={() => (preview ? closePreview() : void previewDraft())}
          >
            {preview ? "Close preview" : "Preview draft"}
          </button>
          <button
            className="btn-sm btn-secondary btn-orange-outline"
            type="button"
            disabled={contentDisabled}
            onClick={() => void save()}
          >
            <Save size={16} /> Save draft
          </button>
          <button
            className="btn-sm btn-secondary btn-orange-outline"
            type="button"
            disabled={contentDisabled || saveState === "saving"}
            onClick={() => setConfirmAction("discard")}
          >
            <Trash2 size={16} /> Discard draft
          </button>
          <button
            className="btn-sm btn-primary"
            type="button"
            disabled={contentDisabled}
            onClick={() => {
              if (previewedContent.current !== JSON.stringify(content)) {
                setError("Save and preview the current draft before publishing it.");
                return;
              }
              setConfirmAction("publish");
            }}
          >
            {busy ? "Saving…" : "Publish"}
          </button>
        </div>
      </header>
      <section className={`website-content-save-status is-${saveState}`} aria-live="polite">
        <div><Clock3 size={17} /><strong>{saveState === "saving" ? "Saving your draft…" : saveState === "error" ? "Automatic save needs attention" : hasServerDraft || lastSavedAt ? "Draft saved privately" : "Ready to edit"}</strong></div>
        <span>{saveState === "saved" && lastSavedAt ? `Last saved ${lastSavedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · recovery points expire after 7 days` : saveState === "error" ? "Your browser recovery copy expires after 7 days." : hasServerDraft ? "The private draft stays until it is published or discarded. Recovery points expire after 7 days." : "No private draft yet. New edits save automatically; recovery points expire after 7 days."}</span>
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
            {BUILT_IN_PREVIEW_PAGES.map(page => <option key={page.path} value={page.path}>{page.title}</option>)}
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
        <div className="website-content-toast saved-notice" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={16} /></button>
        </div>
      )}
      {confirmAction && (
        <div className="website-editor-confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmAction(null); }}>
          <section className="website-editor-confirm admin-confirm-surface" role="dialog" aria-modal="true" aria-labelledby="website-editor-confirm-title" aria-describedby="website-editor-confirm-copy">
            <div className="website-editor-confirm-icon"><AlertTriangle size={21} aria-hidden="true" /></div>
            <button className="website-editor-confirm-close" type="button" aria-label="Close confirmation" onClick={() => setConfirmAction(null)}><X size={18} /></button>
            <h2 id="website-editor-confirm-title">
              {confirmAction === "publish" ? "Publish website changes?" : confirmAction === "discard" ? "Discard the website draft?" : "Restore default website copy?"}
            </h2>
            <p id="website-editor-confirm-copy">
              {confirmAction === "publish"
                ? "This will make the current reviewed draft visible on the public website."
                : confirmAction === "discard"
                  ? "The shared unpublished draft will be removed and the editor will return to the published version. Other editors will see this change. Recovery points remain available for 7 days."
                  : "All current draft edits will be replaced with the default website copy. The change will be saved privately and will not publish the website."}
            </p>
            <div className="website-editor-confirm-actions">
              <button className="btn-sm btn-secondary" type="button" autoFocus onClick={() => setConfirmAction(null)}>Cancel</button>
              <button className={`btn-sm ${confirmAction === "publish" ? "btn-primary" : "btn-secondary btn-orange-outline"}`} type="button" onClick={confirmPendingAction}>
                {confirmAction === "publish" ? "Publish website" : confirmAction === "discard" ? "Discard draft" : "Restore defaults"}
              </button>
            </div>
          </section>
        </div>
      )}
      <div className="embedded-subnav-bar website-content-section-bar" ref={sectionMenuRef}>
        <h2 className="operations-current-section">{({ "content-pages": "Pages & menus", "content-homepage": "Homepage", "content-guides": "Guides & FAQs", "content-contact": "Business details", "content-privacy": "Policies", "content-metadata": "Search & SEO", "content-footer": "Footer" } as Record<string, string>)[activeContentSection] || "Pages & menus"}</h2>
        {sectionMenuOpen && (
          <div className="embedded-subnav-items website-content-section-menu" id="website-section-menu">
            {WEBSITE_SECTION_ITEMS.map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                className={`subnav-pill ${activeContentSection === id ? "active" : ""}`}
                aria-current={activeContentSection === id ? "page" : undefined}
                onClick={() => {
                  setActiveContentSection(id);
                  try {
                    window.localStorage.setItem(WEBSITE_SECTION_KEY, id);
                  } catch {
                    // Section memory is a convenience; navigation should still work without storage.
                  }
                  setSectionMenuOpen(false);
                  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="operations-menu-trigger"
          aria-label="Open website editor sections"
          aria-expanded={sectionMenuOpen}
          aria-controls="website-section-menu"
          title="Open website editor sections"
          onClick={() => setSectionMenuOpen((open) => !open)}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>
      {activeContentSection !== "content-pages" && (
        <div className="website-content-section-backrow">
          <button
            type="button"
            className="btn-sm btn-secondary admin-back-button"
            onClick={() => {
              setActiveContentSection("content-pages");
              try {
                window.localStorage.setItem(WEBSITE_SECTION_KEY, "content-pages");
              } catch {
                // The focused view can still close when storage is unavailable.
              }
              window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#content-pages`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Back to Pages & menus
          </button>
        </div>
      )}
      <div id={activeContentSection} className="website-content-focused-view website-content-anchor">
        {activeContentSection === "content-pages" && <>
          <NavigationControls content={content} disabled={contentDisabled} onChange={updateContent} />
          <WebsitePageBuilder
            content={content}
            disabled={contentDisabled}
            onChange={updateContent}
            token={token}
            customerUrl={customerUrl}
            onSignOut={onSignOut}
            onBusyChange={setMediaBusy}
          />
          {renderContentGroups(["Why Us", "Get Quote"])}
        </>}
        {activeContentSection === "content-homepage" && <>
          <HomepageSectionControls content={content} disabled={contentDisabled} onChange={updateContent} />
          <HomepageContentBlocks content={content} disabled={contentDisabled} onChange={updateContent} />
          <HomepageCategoryImages
            token={token}
            content={content}
            customerUrl={customerUrl}
            onChange={(images) => updateContent((old) => ({ ...old, "home.categoryImages": JSON.stringify(images) }))}
            onBusyChange={setMediaBusy}
            onSignOut={onSignOut}
          />
          {renderContentGroups(["Homepage"])}
        </>}
        {activeContentSection === "content-guides" && <>
          <FaqEditor content={content} disabled={contentDisabled} onChange={updateContent} />
          <GuideControls content={content} disabled={contentDisabled} onChange={updateContent} />
          {renderContentGroups(["Tools & Guides"])}
        </>}
        {activeContentSection === "content-contact" && <>
          {renderContentGroups(["Business details"])}
          <SocialLinksEditor content={content} disabled={contentDisabled} onChange={updateContent} />
        </>}
        {activeContentSection === "content-privacy" && <>
          <PolicyEditor kind="privacy" content={content} disabled={contentDisabled} onChange={updateContent} />
          <PolicyEditor kind="terms" content={content} disabled={contentDisabled} onChange={updateContent} />
          <PolicyEditor kind="shipping" content={content} disabled={contentDisabled} onChange={updateContent} />
          <PolicyEditor kind="returns" content={content} disabled={contentDisabled} onChange={updateContent} />
        </>}
        {activeContentSection === "content-metadata" && renderContentGroups(["Page metadata"])}
        {activeContentSection === "content-footer" && renderContentGroups(["Footer"])}
        {!loading && activeContentSection !== "content-privacy" && (
          <p className="website-content-note">Text is stored as plain text. Page layout, product images, prices and availability are managed separately.</p>
        )}
      </div>
    </div>
  );
}
