import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Pencil, Plus, Save, Tags, Upload, X } from "lucide-react";
import { buildCatalogueCategoryDirectory, normalizeCatalogueCategory, partnerBrandDefaultLogoUrl, resolveCatalogueCategoryId, STOREFRONT_CATEGORIES, type ManagedCatalogueCategory } from "@material-square/types";
import PartnerBrandLogo from "../../../../../packages/storefront-ui/PartnerBrandLogo";

type Brand = { id: string; name: string; category: string; categories?: string[]; tagline: string; logoUrl?: string | null; isActive: boolean; sortOrder: number };

function normalizeBrand(brand: Brand, directory: ManagedCatalogueCategory[] = []): Brand {
  const sourceCategories = Array.isArray(brand.categories) && brand.categories.length
    ? brand.categories
    : brand.category ? [brand.category] : [];
  const categories = [...new Set(sourceCategories.map((category) => {
    const normalizedId = normalizeCatalogueCategory(category);
    return directory.find((option) => option.id === resolveCatalogueCategoryId(category, directory) || option.id === normalizedId || option.aliases.some((alias) => normalizeCatalogueCategory(alias) === normalizedId))?.label
      || STOREFRONT_CATEGORIES.find((option) => option.id === normalizedId)?.label || category.trim();
  }).filter(Boolean))];
  return { ...brand, categories, category: categories[0] || "" };
}

function CategoryEditor({ categories = [], managedCategories = [], disabled, onChange }: { categories?: string[]; managedCategories?: ManagedCatalogueCategory[]; disabled?: boolean; onChange: (categories: string[]) => void }) {
  const [value, setValue] = useState("");
  const [customValue, setCustomValue] = useState("");
  const categoryOptions = new Map<string, { id: string; label: string }>();
  for (const category of managedCategories.filter((option) => option.active)) categoryOptions.set(category.id, { id: category.id, label: category.label });
  const add = () => {
    const selected = [...categoryOptions.values()].find((category) => category.id === value);
    const custom = value === "__custom__" ? customValue.trim() : "";
    const categoryId = selected?.id || (custom ? normalizeCatalogueCategory(custom) : "");
    const categoryLabel = selected?.label || (custom
      ? categoryOptions.get(categoryId)?.label || custom
      : "");
    if (!categoryId || !categoryLabel || categories.some((category) => resolveCatalogueCategoryId(category, managedCategories) === categoryId)) return;
    onChange([...categories, categoryLabel]);
    setValue("");
    setCustomValue("");
  };
  return <div className="partner-brand-categories">
    <div className="partner-brand-category-add">
      <select disabled={disabled} value={value} onChange={(event) => setValue(event.target.value)} aria-label="Choose a category to add">
        <option value="">Choose a category</option>
        {[...categoryOptions.values()].filter((category) => !categories.some((current) => resolveCatalogueCategoryId(current, managedCategories) === category.id)).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        <option value="__custom__">＋ Add a new category…</option>
      </select>
      {value === "__custom__" && <input disabled={disabled} maxLength={80} value={customValue} onChange={(event) => setCustomValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder="Enter new category" aria-label="New category name" />}
      <button className="btn-sm btn-secondary" type="button" disabled={disabled || (value === "__custom__" ? !customValue.trim() : !value)} onClick={add}><Plus size={13} /> Add</button>
    </div>
    <div className="partner-brand-category-chips">{categories.map((category) => <span key={category}><span className="partner-brand-category-label">{category}</span><button className="partner-brand-category-remove" type="button" disabled={disabled} aria-label={`Remove ${category} category`} onClick={() => onChange(categories.filter((item) => item !== category))}><X size={12} /></button></span>)}</div>
  </div>;
}

function brandLogoUrl(brand: Pick<Brand, "id" | "logoUrl">, customerUrl?: string) {
  const logoUrl = brand.logoUrl || partnerBrandDefaultLogoUrl(brand.id);
  if (!logoUrl) return "";
  if (!logoUrl.startsWith("/")) return logoUrl;
  const base = customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || "https://material-square.vercel.app";
  return `${base.replace(/\/$/, "")}${logoUrl}`;
}

function brandLogoBaseUrl(customerUrl?: string) {
  return customerUrl || import.meta.env.VITE_CUSTOMER_APP_URL || "https://material-square.vercel.app";
}

function brandLogoPreviewUrl(logoUrl: string, brandId: string, customerUrl?: string) {
  const mediaPageFile = logoUrl.match(/#\/media\/File:(.+)$/i)?.[1];
  if (mediaPageFile && /^https?:\/\/([a-z0-9-]+\.)?wikipedia\.org\//i.test(logoUrl)) {
    let filename = mediaPageFile;
    try { filename = decodeURIComponent(filename); } catch { /* Keep the pasted filename as-is. */ }
    return `https://en.wikipedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
  }
  return brandLogoUrl({ id: brandId, logoUrl: logoUrl || null }, customerUrl);
}

function LogoPreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src) return <div className="partner-brand-logo-preview is-empty"><ImagePlus size={22} /><span>Logo preview</span></div>;
  return <div className={`partner-brand-logo-preview${failed ? " has-error" : ""}`}>
    {!failed
      ? <img src={src} alt={alt} onError={() => setFailed(true)} />
      : <span>Couldn’t load this image URL. Use a direct image link or upload a file.</span>}
  </div>;
}

export default function PartnerBrandsManager({ token, role, onSignOut, onBack, onContentReady, embedded = false, customerUrl }: { token: string; role: string; onSignOut: () => void; onBack: () => void; onContentReady?: (ready: boolean) => void; embedded?: boolean; customerUrl?: string }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [managedCategories, setManagedCategories] = useState<ManagedCatalogueCategory[]>(() => buildCatalogueCategoryDirectory());
  const [categoryDraft, setCategoryDraft] = useState<ManagedCatalogueCategory[]>([]);
  const [categoryBaseline, setCategoryBaseline] = useState("");
  const [draft, setDraft] = useState({ name: "", categories: [] as string[], tagline: "", logoUrl: "", isActive: true });
  const [baseline, setBaseline] = useState(() => JSON.stringify({ name: "", categories: [], tagline: "", logoUrl: "", isActive: true }));
  const [originalLogoUrl, setOriginalLogoUrl] = useState("");
  const [view, setView] = useState<"list" | "add" | "edit" | "categories">(() => {
    const requested = new URLSearchParams(window.location.search).get("brandView");
    return requested === "add" || requested === "edit" || requested === "categories" ? requested : "list";
  });
  const [editingId, setEditingId] = useState(() => new URLSearchParams(window.location.search).get("brandId") || "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const hasUnsavedChanges = JSON.stringify(draft) !== baseline;
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
    onContentReady?.(false);
    try {
      const [brandRows, categoryRows] = await Promise.all([
        request("/products/catalogue/partner-brands"),
        request("/products/catalogue/categories"),
      ]);
      const directory = buildCatalogueCategoryDirectory(Array.isArray(categoryRows) ? categoryRows : [], (Array.isArray(brandRows) ? brandRows : []).flatMap((brand: Brand) => brand.categories || (brand.category ? [brand.category] : [])));
      setManagedCategories(directory);
      setCategoryDraft(directory);
      setCategoryBaseline(JSON.stringify(directory));
      setBrands((Array.isArray(brandRows) ? brandRows : []).map((brand: Brand) => normalizeBrand(brand, directory)));
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load partner brands."); }
    finally { setLoading(false); onContentReady?.(true); }
  }, [onContentReady, request]);
  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === "list") {
      url.searchParams.delete("brandView");
      url.searchParams.delete("brandId");
    } else {
      url.searchParams.set("brandView", view);
      if (view === "edit" && editingId) url.searchParams.set("brandId", editingId);
      else url.searchParams.delete("brandId");
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [editingId, view]);

  useEffect(() => {
    if (view !== "edit" || !editingId || loading) return;
    const brand = brands.find((entry) => entry.id === editingId);
    if (!brand) {
      setView("list");
      setEditingId("");
      return;
    }
    const nextDraft = { name: brand.name, categories: brand.categories || [], tagline: brand.tagline, logoUrl: brand.logoUrl || partnerBrandDefaultLogoUrl(brand.id) || "", isActive: brand.isActive };
    setDraft(nextDraft);
    setBaseline(JSON.stringify(nextDraft));
    setOriginalLogoUrl(nextDraft.logoUrl);
  }, [brands, editingId, loading, view]);

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
    const nextDraft = { name: brand.name, categories: brand.categories || [], tagline: brand.tagline, logoUrl: brand.logoUrl || partnerBrandDefaultLogoUrl(brand.id) || "", isActive: brand.isActive };
    setDraft(nextDraft); setBaseline(JSON.stringify(nextDraft)); setOriginalLogoUrl(nextDraft.logoUrl); setPreviewKey((key) => key + 1);
    setView("edit"); setError(""); setNotice("");
  }

  function leaveEditor(message: string) {
    const cleanDraft = { name: "", categories: [] as string[], tagline: "", logoUrl: "", isActive: true };
    setView("list"); setEditingId(""); setDraft(cleanDraft); setBaseline(JSON.stringify(cleanDraft)); setOriginalLogoUrl(""); setError(""); setShowExitConfirm(false); setNotice(message);
  }

  function requestEditorExit() {
    if (hasUnsavedChanges) setShowExitConfirm(true);
    else leaveEditor("No changes were made. Your saved brand logo is unchanged.");
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
      const categoryRows = await request("/products/catalogue/categories");
      const directory = buildCatalogueCategoryDirectory(categoryRows, saved.flatMap((brand: Brand) => brand.categories || []));
      setManagedCategories(directory);
      const cleanDraft = { name: "", categories: [] as string[], tagline: "", logoUrl: "", isActive: true };
      setBrands(saved.map((brand: Brand) => normalizeBrand(brand, directory))); setView("list"); setEditingId(""); setDraft(cleanDraft); setBaseline(JSON.stringify(cleanDraft)); setOriginalLogoUrl(""); setShowExitConfirm(false);
      setNotice(view === "edit" ? "Brand updated." : "Brand added.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save partner brand."); }
    finally { setBusy(false); }
  }

  return <section className="catalogue-manager partner-brands-manager">
    <header className="catalogue-manager-head">
      <div>
        {!embedded && view === "list" && <button className="btn-sm btn-secondary" type="button" onClick={onBack}><ArrowLeft size={14} /> Products</button>}
        {view !== "list" && <button className="btn-sm btn-secondary" type="button" onClick={() => { setView("list"); setError(""); setNotice(""); }}><ArrowLeft size={14} /> Back to brands</button>}
        <span className="eyebrow">WEBSITE CATALOGUE</span>
        <h2>{view === "add" ? "Add brand" : view === "edit" ? "Edit brand" : view === "categories" ? "Manage categories" : "Partner brands"}</h2>
        <p>{view === "list" ? "Manage partner brands, category assignments, and storefront visibility." : view === "add" ? "Add a brand to make it available across the catalogue and customer search." : view === "edit" ? "Update this brand’s details, categories, logo, or customer visibility." : "Rename categories and control which ones appear in admin pickers and the storefront."}</p>
      </div>
      {view === "list" && <div className="partner-brand-head-actions"><button className="btn-sm btn-secondary" type="button" disabled={!canManage || loading} onClick={() => { const next = managedCategories.map((category) => ({ ...category, aliases: [...category.aliases] })); setCategoryDraft(next); setCategoryBaseline(JSON.stringify(next)); setView("categories"); setError(""); setNotice(""); }}><Tags size={15} /> Manage categories</button><button className="btn-sm btn-primary" type="button" disabled={!canManage || loading} onClick={() => { const cleanDraft = { name: "", categories: [] as string[], tagline: "", logoUrl: "", isActive: true }; setDraft(cleanDraft); setBaseline(JSON.stringify(cleanDraft)); setPreviewKey((key) => key + 1); setView("add"); setError(""); setNotice(""); }}><Plus size={15} /> Add brand</button></div>}
    </header>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="partner-brand-action-notice" role="status">{notice}</p>}
    {view === "categories" && canManage && <form className="partner-brand-category-manager" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError(""); setNotice("");
      try {
        const saved = await request("/products/catalogue/categories", "PUT", categoryDraft);
        const directory = buildCatalogueCategoryDirectory(saved, brands.flatMap((brand) => brand.categories || []));
        setManagedCategories(directory); setCategoryDraft(directory); setCategoryBaseline(JSON.stringify(directory));
        setBrands((current) => current.map((brand) => normalizeBrand(brand, directory)));
        setNotice("Categories updated across admin and storefront.");
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save categories."); }
      finally { setBusy(false); }
    }}>
      <div className="partner-brand-category-manager-note"><strong>Custom categories</strong><span>Create a custom category while adding or editing a Partner Brand. Its category appears here automatically.</span></div>
      {categoryDraft.map((category, index) => <article className="partner-brand-category-row" key={category.id}>
        <div><strong>{STOREFRONT_CATEGORIES.some((item) => item.id === category.id) ? "Standard category" : "Custom category"}</strong><small>{category.id}</small></div>
        <label>Display name<input required value={category.label} maxLength={120} onChange={(event) => setCategoryDraft((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, label: event.target.value } : item))} /></label>
        <label className="partner-brand-category-active"><input type="checkbox" checked={category.active} onChange={(event) => setCategoryDraft((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, active: event.target.checked } : item))} /> Active</label>
      </article>)}
      <div className="partner-brand-form-actions"><button className="btn-sm btn-secondary" type="button" onClick={() => { setView("list"); setError(""); }}>Cancel</button><button className="btn-sm btn-primary" type="submit" disabled={!canManage || busy || JSON.stringify(categoryDraft) === categoryBaseline}><Save size={14} /> {busy ? "Saving…" : "Save categories"}</button></div>
    </form>}
    {(view === "add" || view === "edit") && canManage && <form id="partner-brand-form" className="partner-brand-add" data-admin-unsaved-form onSubmit={saveBrand}>
      <strong>{view === "add" ? <><Plus size={16} /> New partner brand</> : <><Pencil size={16} /> Brand details</>}</strong>
      <label>Brand name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. New partner brand" /></label>
      <label>Categories<CategoryEditor categories={draft.categories} managedCategories={managedCategories} onChange={(categories) => setDraft({ ...draft, categories })} /></label>
      <label>Tagline (optional)<input maxLength={160} value={draft.tagline} onChange={(event) => setDraft({ ...draft, tagline: event.target.value })} placeholder="Short descriptor" /></label>
      <div className="partner-brand-logo-editor">
        <span>Brand logo (optional)</span>
        <div className="partner-brand-logo-controls">
          {view === "edit" && draft.logoUrl === originalLogoUrl
            ? <div className="partner-brand-logo-preview"><PartnerBrandLogo brand={{ id: editingId, name: draft.name, logoUrl: draft.logoUrl || null }} assetBaseUrl={brandLogoBaseUrl(customerUrl)} className="partner-brand-summary-logo-mark" style={{ width: "100%", height: "100%" }} /></div>
            : <LogoPreview key={previewKey} src={brandLogoPreviewUrl(draft.logoUrl, editingId, customerUrl)} alt={`${draft.name || "Brand"} logo preview`} />}
          <label className="btn-sm btn-secondary partner-brand-upload"><Upload size={14} /> Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(uploading)} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadLogo(file, input, "draft", (logoUrl) => { setDraft((current) => ({ ...current, logoUrl })); setPreviewKey((key) => key + 1); }); }} /></label>
          {draft.logoUrl && <button className="partner-brand-clear" type="button" aria-label="Remove new brand logo" onClick={() => { setDraft({ ...draft, logoUrl: "" }); setPreviewKey((key) => key + 1); }}><X size={14} /></button>}
          <small className="partner-brand-logo-guidance"><strong>Recommended size:</strong> 320 × 160 px <span aria-hidden="true">·</span> <strong>Maximum upload:</strong> 30 MB <span>PNG, JPEG, or WebP. Logos are fitted inside the display frame.</span></small>
        </div>
        <small className="partner-brand-preview-note">Live preview only. The saved brand changes only after you choose Save brand.</small>
        <label className="partner-brand-logo-url">Or paste a logo URL<span className="partner-brand-logo-url-field"><input type="text" inputMode="url" maxLength={1000} value={draft.logoUrl} onChange={(event) => { setDraft({ ...draft, logoUrl: event.target.value }); setPreviewKey((key) => key + 1); }} placeholder="Paste a direct image URL or Wikimedia file page" />{draft.logoUrl && <button className="partner-brand-url-clear" type="button" aria-label="Clear logo URL" onClick={() => { setDraft((current) => ({ ...current, logoUrl: "" })); setPreviewKey((key) => key + 1); }}><X size={15} /></button>}</span></label>
      </div>
      <label className="partner-brand-active"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Active in customer search</label>
      <div className="partner-brand-form-actions"><button className="btn-sm btn-secondary" type="button" onClick={requestEditorExit}>Cancel</button><button className="btn-sm btn-primary" type="submit" disabled={!canManage || busy || Boolean(uploading)}><Save size={14} /> {busy ? "Saving…" : "Save brand"}</button></div>
    </form>}
    {showExitConfirm && <div className="partner-brand-confirm-backdrop" role="presentation">
      <section className="partner-brand-confirm" role="alertdialog" aria-modal="true" aria-labelledby="partner-brand-confirm-title" aria-describedby="partner-brand-confirm-copy">
        <button className="partner-brand-confirm-close" type="button" aria-label="Keep editing" title="Keep editing" onClick={() => setShowExitConfirm(false)}><X size={20} /></button>
        <h3 id="partner-brand-confirm-title">Discard unsaved changes?</h3>
        <p id="partner-brand-confirm-copy">Your changes to {draft.name || "this brand"} have not been saved. Leaving now will keep the current logo and brand details unchanged.</p>
        <div className="partner-brand-confirm-actions">
          <button className="btn-sm btn-secondary" type="button" onClick={() => setShowExitConfirm(false)}>Keep editing</button>
          <button className="btn-sm btn-danger" type="button" onClick={() => leaveEditor("Unsaved changes discarded. The saved brand logo was left unchanged.")}>Exit without saving</button>
        </div>
      </section>
    </div>}
    {view === "list" && (loading ? <p className="catalogue-loading">Loading partner brands…</p> : <div className="partner-brand-list">
      <div className="partner-brand-list-head"><span><Tags size={15} /> {brands.length} brands</span><span>{brands.filter((brand) => brand.isActive).length} active for customers</span></div>
      {brands.map((brand) => <article className={`partner-brand-summary ${brand.isActive ? "" : "is-archived"}`} key={brand.id}>
        <div className="partner-brand-summary-logo"><PartnerBrandLogo brand={brand} assetBaseUrl={brandLogoBaseUrl(customerUrl)} className="partner-brand-summary-logo-mark" style={{ width: "100%", height: "100%" }} /></div>
        <div className="partner-brand-summary-copy"><strong>{brand.name}</strong><span>{brand.categories?.length ? brand.categories.join(" · ") : brand.category || "No categories"}</span>{brand.tagline && <small>{brand.tagline}</small>}</div>
        <span className={`partner-brand-status ${brand.isActive ? "is-active" : ""}`}>{brand.isActive ? "Active" : "Inactive"}</span>
        {canManage && <button className="btn-sm btn-secondary" type="button" onClick={() => editBrand(brand)}><Pencil size={14} /> Edit</button>}
      </article>)}
      {!brands.length && <p className="catalogue-empty">No partner brands have been added.</p>}
    </div>)}
  </section>;
}
