import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, Save, Tags } from "lucide-react";

type Brand = { id: string; name: string; category: string; tagline: string; isActive: boolean; sortOrder: number };

export default function PartnerBrandsManager({ token, role, onSignOut, onBack }: { token: string; role: string; onSignOut: () => void; onBack: () => void }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [draft, setDraft] = useState({ name: "", category: "", tagline: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canManage = ["SUPER_ADMIN", "ADMIN", "CATALOG_MANAGER"].includes(role);

  const request = useCallback(async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
      method,
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401) onSignOut();
    if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Could not load partner brands.");
    return result;
  }, [token, onSignOut]);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    try { setBrands(await request("/products/catalogue/partner-brands")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load partner brands."); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void refresh(); }, [refresh]);

  function update(id: string, changes: Partial<Brand>) {
    setBrands((current) => current.map((brand) => brand.id === id ? { ...brand, ...changes } : brand));
  }
  function addBrand() {
    const name = draft.name.trim();
    if (!name || !draft.category.trim()) return;
    const id = name.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (brands.some((brand) => brand.id === id || brand.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setError("That brand is already in the partnership list."); return;
    }
    setBrands((current) => [...current, { id, name, category: draft.category.trim(), tagline: draft.tagline.trim(), isActive: true, sortOrder: current.length }]);
    setDraft({ name: "", category: "", tagline: "" }); setError(""); setNotice("Brand added. Save changes to publish it to search and the storefront.");
  }
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await request("/products/catalogue/partner-brands", "PUT", brands.map((brand, sortOrder) => ({ ...brand, sortOrder })));
      setBrands(saved); setNotice("Partner brands saved. Active brands are now available in customer search and the storefront.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save partner brands."); }
    finally { setBusy(false); }
  }

  return <section className="catalogue-manager partner-brands-manager">
    <header className="catalogue-manager-head">
      <div><button className="btn-sm btn-secondary" type="button" onClick={onBack}><ArrowLeft size={14} /> Products</button><span className="eyebrow">WEBSITE CATALOGUE</span><h2>Partner brands</h2><p>Manage the client’s brand partnerships. Deactivated brands are hidden from customers while existing product and quote history stays intact.</p></div>
      <button className="btn-sm btn-primary" type="button" disabled={!canManage || busy || loading} onClick={() => void save()}><Save size={15} /> Save changes</button>
    </header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="saved-notice" role="status">{notice}</p>}
    {canManage && <form className="partner-brand-add" onSubmit={(event) => { event.preventDefault(); addBrand(); }}>
      <strong><Plus size={16} /> Add a partner brand</strong>
      <label>Brand name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. New partner brand" /></label>
      <label>Category<input required maxLength={80} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Paints" /></label>
      <label>Tagline (optional)<input maxLength={160} value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} placeholder="Short descriptor" /></label>
      <button className="btn-sm btn-secondary" type="submit"><Plus size={14} /> Add</button>
    </form>}
    {loading ? <p className="catalogue-loading">Loading partner brands…</p> : <div className="partner-brand-list">
      <div className="partner-brand-list-head"><span><Tags size={15} /> {brands.length} brands</span><span>{brands.filter((brand) => brand.isActive).length} active for customers</span></div>
      {brands.map((brand) => <article className={`partner-brand-row ${brand.isActive ? "" : "is-archived"}`} key={brand.id}>
        <label>Brand name<input disabled={!canManage} maxLength={120} value={brand.name} onChange={(event) => update(brand.id, { name: event.target.value })} /></label>
        <label>Category<input disabled={!canManage} maxLength={80} value={brand.category} onChange={(event) => update(brand.id, { category: event.target.value })} /></label>
        <label>Tagline<input disabled={!canManage} maxLength={160} value={brand.tagline} onChange={(event) => update(brand.id, { tagline: event.target.value })} /></label>
        <label className="partner-brand-active"><input type="checkbox" disabled={!canManage} checked={brand.isActive} onChange={(event) => update(brand.id, { isActive: event.target.checked })} /> Active in customer search</label>
      </article>)}
      {!brands.length && <p className="catalogue-empty">No partner brands have been added.</p>}
    </div>}
  </section>;
}
