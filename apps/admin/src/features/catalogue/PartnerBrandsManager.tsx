import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Pencil, Plus, Save, Tags, Upload, X } from "lucide-react";

type Brand = { id: string; name: string; category: string; categories?: string[]; tagline: string; logoUrl?: string | null; isActive: boolean; sortOrder: number };

function normalizeBrand(brand: Brand): Brand {
  const categories = Array.isArray(brand.categories) && brand.categories.length
    ? brand.categories
    : brand.category ? [brand.category] : [];
  return { ...brand, categories, category: categories[0] || "" };
}

function CategoryEditor({ categories = [], disabled, onChange }: { categories?: string[]; disabled?: boolean; onChange: (categories: string[]) => void }) {
  const [value, setValue] = useState("");
  const add = () => {
    const next = value.trim();
    if (!next || categories.some((category) => category.toLocaleLowerCase() === next.toLocaleLowerCase())) return;
    onChange([...categories, next]);
    setValue("");
  };
  return <div className="partner-brand-categories">
    <div className="partner-brand-category-add"><input disabled={disabled} maxLength={80} value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="Add a category" /><button className="btn-sm btn-secondary" type="button" disabled={disabled || !value.trim()} onClick={add}><Plus size={13} /> Add</button></div>
    <div className="partner-brand-category-chips">{categories.map((category) => <span key={category}><span className="partner-brand-category-label">{category}</span><button className="partner-brand-category-remove" type="button" disabled={disabled} aria-label={`Remove ${category} category`} onClick={() => onChange(categories.filter((item) => item !== category))}><X size={12} /></button></span>)}</div>
  </div>;
}

const builtInLogoFiles: Array<[RegExp, string]> = [
  [/ultra\s*tech/i, "ultratech.png"],
  [/ambuja/i, "ambuja_horizontal_official.png"],
  [/jk\s*cement/i, "jk_cement.png"],
  [/shree/i, "shree_cement.png"],
  [/asian\s*paint|apex/i, "asian_paints_official.jpg"],
  [/birla|opus/i, "birla_opus.png"],
  [/astral/i, "astral_pipes.png"],
  [/supreme/i, "supreme.png"],
  [/finolex.*cable|finolex.*wire/i, "finolex_cables.png"],
  [/finolex/i, "finolex_pipes.png"],
  [/zoloto/i, "zoloto.png"],
  [/polycab/i, "polycab.png"],
  [/havells/i, "havells.png"],
  [/jaquar/i, "jaquar.png"],
  [/cera/i, "cera_official_transparent.png"],
  [/tata|tiscon/i, "tata-tiscon.svg"],
  [/laticrete|myk/i, "myk_laticrete.png"],
];

function builtInLogoUrl(brand: Brand, customerUrl?: string) {
  const file = builtInLogoFiles.find(([pattern]) => pattern.test(`${brand.id} ${brand.name}`))?.[1];
  if (!file) return "";
  const base = customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || "https://material-square.vercel.app";
  return `${base.replace(/\/$/, "")}/images/brands/${file}`;
}

export default function PartnerBrandsManager({ token, role, onSignOut, onBack, embedded = false, customerUrl }: { token: string; role: string; onSignOut: () => void; onBack: () => void; embedded?: boolean; customerUrl?: string }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [draft, setDraft] = useState({ name: "", categories: [] as string[], tagline: "", logoUrl: "", isActive: true });
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
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
    try { setBrands((await request("/products/catalogue/partner-brands")).map(normalizeBrand)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load partner brands."); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void refresh(); }, [refresh]);

  async function uploadLogo(file: File, input: HTMLInputElement, key: string, onUploaded: (url: string) => void) {
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP brand logo."); input.value = ""; return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("Brand logos must be 30 MB or smaller."); input.value = ""; return;
    }
    setUploading(key); setError(""); setNotice("");
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/storage/images`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body,
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json().catch(() => null) as { url?: string; message?: string } | null;
      if (response.status === 401) onSignOut();
      if (!response.ok || !result?.url) throw new Error(typeof result?.message === "string" ? result.message : "Could not upload this brand logo.");
      onUploaded(result.url); setNotice("Logo uploaded. Save the brand to publish it across the storefront."); input.value = "";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload this brand logo.");
    } finally { setUploading(""); }
  }

  function editBrand(brand: Brand) {
    setEditingId(brand.id);
    setDraft({ name: brand.name, categories: brand.categories || [], tagline: brand.tagline, logoUrl: brand.logoUrl || "", isActive: brand.isActive });
    setView("edit"); setError(""); setNotice("");
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    if (!draft.categories.length) { setError("Add at least one category for this brand."); return; }
    const id = view === "edit" ? editingId : name.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (brands.some((brand) => brand.id !== editingId && (brand.id === id || brand.name.toLocaleLowerCase() === name.toLocaleLowerCase()))) {
      setError("That brand is already in the partnership list."); return;
    }
    const next = view === "edit"
      ? brands.map((brand) => brand.id === editingId ? { ...brand, name, category: draft.categories[0], categories: draft.categories, tagline: draft.tagline.trim(), logoUrl: draft.logoUrl || null, isActive: draft.isActive } : brand)
      : [...brands, { id, name, category: draft.categories[0], categories: draft.categories, tagline: draft.tagline.trim(), logoUrl: draft.logoUrl || null, isActive: draft.isActive, sortOrder: brands.length }];
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await request("/products/catalogue/partner-brands", "PUT", next.map((brand, sortOrder) => ({ ...brand, categories: brand.categories?.length ? brand.categories : brand.category ? [brand.category] : [], category: brand.categories?.[0] || brand.category, sortOrder })));
      setBrands(saved.map(normalizeBrand)); setView("list"); setEditingId(""); setDraft({ name: "", categories: [], tagline: "", logoUrl: "", isActive: true });
      setNotice(view === "edit" ? "Brand updated." : "Brand added.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save partner brand."); }
    finally { setBusy(false); }
  }

  return <section className="catalogue-manager partner-brands-manager">
    <header className="catalogue-manager-head">
      <div>
        {!embedded && view === "list" && <button className="btn-sm btn-secondary" type="button" onClick={onBack}><ArrowLeft size={14} /> Products</button>}
        {view !== "list" && <button className="btn-sm btn-secondary" type="button" onClick={() => { setView("list"); setEditingId(""); setError(""); setNotice(""); }}><ArrowLeft size={14} /> Back to brands</button>}
        <span className="eyebrow">WEBSITE CATALOGUE</span>
        <h2>{view === "add" ? "Add brand" : view === "edit" ? "Edit brand" : "Partner brands"}</h2>
        <p>{view === "list" ? "Manage partner brands and their storefront logos. Edit a brand to update its details." : view === "add" ? "Add a brand to make it available across the catalogue and customer search." : "Update this brand’s details, categories, logo, or customer visibility."}</p>
      </div>
      {view === "list" && <button className="btn-sm btn-primary" type="button" disabled={!canManage || loading} onClick={() => { setDraft({ name: "", categories: [], tagline: "", logoUrl: "", isActive: true }); setView("add"); setError(""); setNotice(""); }}><Plus size={15} /> Add brand</button>}
    </header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="saved-notice" role="status">{notice}</p>}
    {view !== "list" && canManage && <form id="partner-brand-form" className="partner-brand-add" onSubmit={saveBrand}>
      <strong>{view === "add" ? <><Plus size={16} /> New partner brand</> : <><Pencil size={16} /> Brand details</>}</strong>
      <label>Brand name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. New partner brand" /></label>
      <label>Categories<CategoryEditor categories={draft.categories} onChange={(categories) => setDraft({ ...draft, categories })} /></label>
      <label>Tagline (optional)<input maxLength={160} value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} placeholder="Short descriptor" /></label>
      <div className="partner-brand-logo-editor">
        <span>Brand logo (optional)</span>
        <div className="partner-brand-logo-controls">
          {draft.logoUrl ? <img src={draft.logoUrl} alt={`${draft.name || "Brand"} logo preview`} /> : view === "edit" && brands.find((brand) => brand.id === editingId) && builtInLogoUrl(brands.find((brand) => brand.id === editingId)!, customerUrl) ? <img src={builtInLogoUrl(brands.find((brand) => brand.id === editingId)!, customerUrl)} alt={`${draft.name} existing logo preview`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="partner-brand-logo-placeholder"><ImagePlus size={18} /></span>}
          <label className="btn-sm btn-secondary partner-brand-upload"><Upload size={14} /> Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(uploading)} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadLogo(file, input, "draft", (logoUrl) => setDraft((current) => ({ ...current, logoUrl }))); }} /></label>
          {draft.logoUrl && <button className="partner-brand-clear" type="button" aria-label="Remove new brand logo" onClick={() => setDraft({ ...draft, logoUrl: "" })}><X size={14} /></button>}
        </div>
        <label className="partner-brand-logo-url">Or paste a logo URL<input type="text" inputMode="url" maxLength={1000} value={draft.logoUrl} onChange={(event) => setDraft({ ...draft, logoUrl: event.target.value })} placeholder="https://… or /images/brands/logo.webp" /></label>
        <small className="partner-brand-logo-guidance"><strong>Recommended size:</strong> 320 × 160 px <span aria-hidden="true">·</span> <strong>Maximum upload:</strong> 30 MB <span>PNG, JPEG, or WebP. Logos are fitted inside the display frame.</span></small>
      </div>
      <label className="partner-brand-active"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Active in customer search</label>
      <div className="partner-brand-form-actions"><button className="btn-sm btn-secondary" type="button" onClick={() => { setView("list"); setEditingId(""); setError(""); }}>Cancel</button><button className="btn-sm btn-primary" type="submit" disabled={!canManage || busy || Boolean(uploading)}><Save size={14} /> {busy ? "Saving…" : "Save brand"}</button></div>
    </form>}
    {view === "list" && (loading ? <p className="catalogue-loading">Loading partner brands…</p> : <div className="partner-brand-list">
      <div className="partner-brand-list-head"><span><Tags size={15} /> {brands.length} brands</span><span>{brands.filter((brand) => brand.isActive).length} active for customers</span></div>
      {brands.map((brand) => <article className={`partner-brand-summary ${brand.isActive ? "" : "is-archived"}`} key={brand.id}>
        <div className="partner-brand-summary-logo">{brand.logoUrl ? <img src={brand.logoUrl} alt="" /> : builtInLogoUrl(brand, customerUrl) ? <img src={builtInLogoUrl(brand, customerUrl)} alt="" onError={(event) => { event.currentTarget.hidden = true; }} /> : <ImagePlus size={18} aria-hidden="true" />}</div>
        <div className="partner-brand-summary-copy"><strong>{brand.name}</strong><span>{brand.categories?.length ? brand.categories.join(" · ") : brand.category || "No categories"}</span>{brand.tagline && <small>{brand.tagline}</small>}</div>
        <span className={`partner-brand-status ${brand.isActive ? "is-active" : ""}`}>{brand.isActive ? "Active" : "Inactive"}</span>
        {canManage && <button className="btn-sm btn-secondary" type="button" onClick={() => editBrand(brand)}><Pencil size={14} /> Edit</button>}
      </article>)}
      {!brands.length && <p className="catalogue-empty">No partner brands have been added.</p>}
    </div>)}
  </section>;
}
