import { useCallback, useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { SITE_CONTENT_DEFAULTS, SITE_CONTENT_GROUPS, type SiteContent } from "@material-square/types";

export default function WebsiteContentManager({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const [content, setContent] = useState<SiteContent>({ ...SITE_CONTENT_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (method = "GET", body?: SiteContent): Promise<SiteContent> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/site-content`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(65000),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401) onSignOut();
    if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Could not load website content.");
    return result as SiteContent;
  }, [token, onSignOut]);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setContent(await request()); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load website content."); }
    finally { setLoading(false); }
  }, [request]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      setContent(await request("PUT", content));
      setNotice("Website copy saved and published.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save website content."); }
    finally { setBusy(false); }
  }

  return <div className="website-content-manager">
    <header className="staff-management-header">
      <div><span className="eyebrow">PUBLIC WEBSITE</span><h2>Pages & business details</h2>
        <p>Edit the approved page copy and contact details shown on the customer website. Product information is managed under Products, prices & offers.</p>
      </div>
      <div className="website-content-actions">
        <button className="btn-sm btn-secondary" type="button" disabled={busy || loading} onClick={() => setContent({ ...SITE_CONTENT_DEFAULTS })}><RotateCcw size={16}/> Restore draft defaults</button>
        <button className="btn-sm btn-primary" type="button" disabled={busy || loading} onClick={() => void save()}><Save size={16}/>{busy ? "Saving…" : "Save and publish"}</button>
      </div>
    </header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="saved-notice" role="status">{notice}</p>}
    {loading ? <p role="status">Loading saved website copy…</p> : SITE_CONTENT_GROUPS.map((group) => <section className="panel-card panel-body website-content-group" key={group.label}>
      <h3>{group.label}</h3>
      <div className="website-content-fields">{group.fields.map(({ key, label, multiline }) => <label key={key}>{label}
        {multiline ? <textarea rows={3} maxLength={2000} value={content[key]} onChange={(event) => setContent((old) => ({ ...old, [key]: event.target.value }))}/> : <input maxLength={2000} value={content[key]} onChange={(event) => setContent((old) => ({ ...old, [key]: event.target.value }))}/>}
      </label>)}</div>
    </section>)}
    <p className="website-content-note">Text is stored as plain text. Page layout, product images, prices and availability are managed separately.</p>
  </div>;
}
