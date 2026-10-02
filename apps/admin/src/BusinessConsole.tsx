import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, RefreshCw, Boxes, Truck, FileText, Users, BookOpen, BadgePercent, Coins } from "lucide-react";
import "./business-console.css";

type Section = "suppliers" | "procurement" | "transport" | "discounts" | "followups" | "blogs" | "experts" | "commissions" | "loyalty";
const sections: { id: Section; label: string; icon: typeof Boxes; endpoint: string }[] = [
  { id: "suppliers", label: "Suppliers", icon: Boxes, endpoint: "/suppliers" },
  { id: "procurement", label: "Procurement", icon: FileText, endpoint: "/procurement" },
  { id: "transport", label: "Transportation", icon: Truck, endpoint: "/transportation" },
  { id: "discounts", label: "Discount rules", icon: BadgePercent, endpoint: "/discount-rules" },
  { id: "followups", label: "Quote follow-ups", icon: FileText, endpoint: "/quotes" },
  { id: "blogs", label: "Blogs", icon: BookOpen, endpoint: "/admin/blogs" },
  { id: "experts", label: "Experts & services", icon: Users, endpoint: "/admin/experts" },
  { id: "commissions", label: "Commissions", icon: Coins, endpoint: "/commissions" },
  { id: "loyalty", label: "Loyalty program", icon: Coins, endpoint: "/admin/loyalty/settings" },
];
const text = (v: unknown) => typeof v === "string" ? v : "";
const field = (data: FormData, key: string) => String(data.get(key) || "").trim();

export default function BusinessConsole({ token, onBack, onSignOut }: { token: string; onBack: () => void; onSignOut: () => void }) {
  const [section, setSection] = useState<Section>("suppliers");
  const [records, setRecords] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [candidates, setCandidates] = useState<Record<string, any[]>>({});
  const active = sections.find((entry) => entry.id === section)!;
  const request = useCallback(async <T,>(url: string, method = "GET", body?: unknown): Promise<T> => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${url}`, {
      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    if (response.status === 401) onSignOut();
    if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Could not complete this action.");
    return result as T;
  }, [token, onSignOut]);
  const refresh = useCallback(async () => {
    setBusy(true); setError("");
    try {
      if (section === "loyalty") setSettings(await request(active.endpoint));
      else setRecords(await request<any[]>(active.endpoint));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load this section."); }
    finally { setBusy(false); }
  }, [active.endpoint, request, section]);
  useEffect(() => { void refresh(); }, [refresh]);
  async function mutate(url: string, method: string, body: unknown): Promise<boolean> {
    setBusy(true); setError(""); setMessage("");
    try { await request(url, method, body); setMessage("Saved."); await refresh(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save this record."); return false; }
    finally { setBusy(false); }
  }
  async function download(url: string, filename: string) {
    setError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${url}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not download the purchase order PDF.");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = objectUrl; anchor.download = filename; anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not download the PDF."); }
  }
  async function submit(e: FormEvent<HTMLFormElement>, makeBody: (form: FormData) => unknown, url = active.endpoint, method = "POST") {
    e.preventDefault();
    const form = e.currentTarget;
    const body = makeBody(new FormData(form));
    const saved = await mutate(url, method, body);
    if (saved) form.reset();
    return saved;
  }
  const item = (record: any, title: string, detail?: string) => <article className="business-record" key={record.id || record.requestNumber || record.purchaseOrderNumber}>
    <div><strong>{title}</strong>{detail && <p>{detail}</p>}<small>{record.status || (record.isActive ? "Active" : "Draft")}</small></div>
    {section === "procurement" && record.id && <button className="bc-button" onClick={async () => {
      try { const result = await request<{ candidates: any[] }>(`/procurement/${record.id}/suppliers`); setCandidates((old) => ({ ...old, [record.id]: result.candidates })); }
      catch (e) { setError(e instanceof Error ? e.message : "Could not find suppliers."); }
    }}>Match suppliers</button>}
    {section === "procurement" && candidates[record.id]?.map((supplier: any) => <div className="business-candidate" key={supplier.id}>
      <span>{supplier.name} · {supplier.matchedItems.join(", ")} · {supplier.serviceAreaMatch ? "Service area match" : "Outside listed service area"}</span>
      <form onSubmit={(e) => submit(e, (f) => ({ supplierId: supplier.id, totalAmount: Number(f.get("amount")), leadTimeDays: Number(f.get("leadTime")), available: true }), `/procurement/${record.id}/quotes`)}>
        <input name="amount" type="number" min="0" step="0.01" placeholder="Supplier total (₹)" required />
        <input name="leadTime" type="number" min="0" placeholder="Lead time (days)" required />
        <button className="bc-button">Save supplier quote</button>
      </form>
    </div>)}
  </article>;

  return <div className="business-console">
    <aside className="business-console-nav">
      <button className="bc-button bc-back" onClick={onBack}><ArrowLeft size={16}/> Main workspace</button>
      <strong>Business management</strong>
      {sections.map(({ id, label, icon: Icon }) => <button className={section === id ? "bc-nav active" : "bc-nav"} key={id} onClick={() => { setSection(id); setMessage(""); setError(""); }}><Icon size={17}/>{label}</button>)}
      <button className="bc-button bc-signout" onClick={onSignOut}>Sign out</button>
    </aside>
    <main className="business-console-main">
      <header className="bc-header"><div><small>STAFF WORKSPACE</small><h1>{active.label}</h1></div><button className="bc-button" onClick={() => void refresh()} disabled={busy}><RefreshCw size={15}/>{busy ? "Loading…" : "Refresh"}</button></header>
      {error && <p className="bc-error" role="alert">{error}</p>}{message && <p className="bc-success" role="status">{message}</p>}
      {section === "suppliers" && <>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ name: field(f,"name"), phone: field(f,"phone"), email: field(f,"email"), address: field(f,"address"), city: field(f,"city"), pincode: field(f,"pincode"), servicePincodes: field(f,"servicePincodes").split(/[ ,]+/).filter(Boolean), status: "PENDING" }))}>
          <h2>Add a supplier</h2><div className="bc-fields"><label>Name<input name="name" required minLength={2}/></label><label>Phone<input name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" required/></label><label>Email<input name="email" type="email"/></label><label>Address<input name="address" required/></label><label>City<input name="city" required/></label><label>PIN code<input name="pincode" pattern="[1-9][0-9]{5}" required/></label><label className="bc-wide">Service PIN codes (comma separated)<input name="servicePincodes" placeholder="201301, 201310"/></label></div><button className="bc-primary" disabled={busy}>Save supplier</button>
        </form>
        <h2>Registered suppliers</h2>{records.map((s) => <article className="business-record bc-record-block" key={s.id}><div><strong>{s.name}</strong><p>{s.city} · {s.pincode} · {s._count?.products ?? 0} listed products</p><small>{s.status}</small></div>{s.status !== "ACTIVE" && <button className="bc-button" onClick={() => void mutate(`/suppliers/${s.id}`, "PATCH", { status: "ACTIVE" })}>Activate supplier</button>}<form className="bc-inline-form" onSubmit={(e) => submit(e, (f) => ({ productName: field(f,"product"), brand: field(f,"brand"), category: field(f,"category"), unit: field(f,"unit"), minimumOrderQty: f.get("minimum") ? Number(f.get("minimum")) : undefined, lastQuotedPrice: f.get("price") ? Number(f.get("price")) : undefined }), `/suppliers/${s.id}/products`)}><input name="product" placeholder="Product supplied" required/><input name="brand" placeholder="Brand"/><input name="category" placeholder="Category" required/><input name="unit" placeholder="Unit" defaultValue="unit" required/><input name="minimum" type="number" min="0" step="0.001" placeholder="Min qty"/><input name="price" type="number" min="0" step="0.01" placeholder="Last quote ₹"/><button className="bc-button">Add product</button></form><form className="bc-inline-form" onSubmit={(e) => submit(e, (f) => ({ priceScore: Number(f.get("priceScore")), deliveryScore: Number(f.get("deliveryScore")), availabilityScore: Number(f.get("availabilityScore")), qualityScore: Number(f.get("qualityScore")), serviceScore: Number(f.get("serviceScore")), comment: field(f,"comment") || undefined }), `/suppliers/${s.id}/ratings`)}><input name="priceScore" type="number" min="1" max="5" defaultValue="5" aria-label="Price rating 1 to 5"/><input name="deliveryScore" type="number" min="1" max="5" defaultValue="5" aria-label="Delivery rating 1 to 5"/><input name="availabilityScore" type="number" min="1" max="5" defaultValue="5" aria-label="Availability rating 1 to 5"/><input name="qualityScore" type="number" min="1" max="5" defaultValue="5" aria-label="Quality rating 1 to 5"/><input name="serviceScore" type="number" min="1" max="5" defaultValue="5" aria-label="Service rating 1 to 5"/><input name="comment" placeholder="Rating notes"/><button className="bc-button">Record supplier rating</button></form></article>)}
      </>}
      {section === "procurement" && <>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ deliveryAddress: field(f,"address"), deliveryCity: field(f,"city"), deliveryPincode: field(f,"pincode"), items: [{ productName: field(f,"product"), brand: field(f,"brand"), category: field(f,"category"), quantity: Number(f.get("quantity")), unit: field(f,"unit") }] }))}>
          <h2>Open a purchase request</h2><div className="bc-fields"><label>Delivery address<input name="address" required/></label><label>City<input name="city" required/></label><label>PIN code<input name="pincode" pattern="[1-9][0-9]{5}" required/></label><label>Product<input name="product" required/></label><label>Brand (optional)<input name="brand"/></label><label>Category<input name="category" required/></label><label>Quantity<input name="quantity" type="number" min="0.001" step="0.001" required/></label><label>Unit<input name="unit" defaultValue="unit" required/></label></div><button className="bc-primary" disabled={busy}>Create purchase request</button>
        </form>
        <h2>Purchase requests</h2>{records.map((r) => <article className="business-record bc-record-block" key={r.id}><div><strong>{r.requestNumber}</strong><p>{r.deliveryCity} · PIN {r.deliveryPincode} · {Array.isArray(r.items) ? r.items.length : 0} requested item(s)</p><small>{r.status}</small></div><button className="bc-button" onClick={async () => { try { const result = await request<{ candidates: any[] }>(`/procurement/${r.id}/suppliers`); setCandidates((old) => ({ ...old, [r.id]: result.candidates })); } catch (e) { setError(e instanceof Error ? e.message : "Could not find suppliers."); } }}>Match suppliers</button>{candidates[r.id]?.map((supplier: any) => <div className="business-candidate" key={supplier.id}><span>{supplier.name} · {supplier.matchedItems.join(", ")} · {supplier.serviceAreaMatch ? "Service area match" : "Outside listed service area"}</span><form onSubmit={(e) => submit(e, (f) => ({ supplierId: supplier.id, totalAmount: Number(f.get("amount")), leadTimeDays: Number(f.get("leadTime")), available: true }), `/procurement/${r.id}/quotes`)}><input name="amount" type="number" min="0" step="0.01" placeholder="Supplier total (₹)" required/><input name="leadTime" type="number" min="0" placeholder="Lead time (days)" required/><button className="bc-button">Save supplier quote</button></form></div>)}{r.supplierQuotes?.map((q: any) => <div className="business-candidate" key={q.id}><strong>{q.supplier.name} · ₹{Number(q.totalAmount).toLocaleString("en-IN")} · {q.leadTimeDays ?? "—"} days</strong>{!q.purchaseOrder && <button className="bc-button" onClick={() => void mutate("/purchase-orders", "POST", { supplierQuoteId: q.id, shippingAddress: r.deliveryAddress, shippingContact: q.supplier.phone, taxAmount: 0, freightAmount: 0 })}>Create purchase order</button>}</div>)}{r.purchaseOrders?.map((po: any) => <div className="business-candidate" key={po.id}><strong>{po.purchaseOrderNumber} · ₹{Number(po.totalAmount).toLocaleString("en-IN")} · {po.status}</strong><button className="bc-button" onClick={() => void download(`/purchase-orders/${po.id}/pdf`, `${po.purchaseOrderNumber}.pdf`)}>Download PO PDF</button>{po.status === "DRAFT" && <button className="bc-button" onClick={() => void mutate(`/purchase-orders/${po.id}/approve`, "POST", {})}>Approve PO</button>}{po.status === "APPROVED" && <button className="bc-button" onClick={() => void mutate(`/purchase-orders/${po.id}/send`, "POST", {})}>Send PO to supplier</button>}</div>)}</article>)}
      </>}
      {section === "transport" && <>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ destination: field(f,"destination"), transporter: field(f,"transporter"), vehicleNumber: field(f,"vehicle"), driverName: field(f,"driver"), driverPhone: field(f,"phone") || null, estimatedArrival: new Date(String(f.get("arrival"))).toISOString(), status: "PLANNED" }), `/transportation/${field(new FormData((e.currentTarget as HTMLFormElement)), "orderId")}`, "PUT")}>
          <h2>Plan an order delivery</h2><div className="bc-fields"><label>Order ID<input name="orderId" required/></label><label>Destination<input name="destination" required/></label><label>Transporter<input name="transporter"/></label><label>Vehicle number<input name="vehicle"/></label><label>Driver name<input name="driver"/></label><label>Driver phone<input name="phone" inputMode="numeric"/></label><label>Estimated arrival<input name="arrival" type="datetime-local" required/></label></div><button className="bc-primary" disabled={busy}>Save delivery plan</button>
        </form>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ truckNumber: field(f,"truck"), driverName: field(f,"driver"), driverPhone: field(f,"phone"), weighbridgeGrossKg: Number(f.get("gross")), weighbridgeTareKg: Number(f.get("tare")), estimatedArrival: new Date(String(f.get("arrival"))).toISOString() }), `/orders/${field(new FormData((e.currentTarget as HTMLFormElement)), "orderId")}/dispatch-challan`)}>
          <h2>Create customer delivery challan</h2><div className="bc-fields"><label>Order ID<input name="orderId" required/></label><label>Truck number<input name="truck" required/></label><label>Driver name<input name="driver" required/></label><label>Driver phone<input name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" required/></label><label>Gross vehicle weight (kg)<input name="gross" type="number" min="0.01" step="0.01" required/></label><label>Tare weight (kg)<input name="tare" type="number" min="0" step="0.01" required/></label><label>Estimated arrival<input name="arrival" type="datetime-local" required/></label></div><button className="bc-primary" disabled={busy}>Issue delivery challan</button>
        </form>
        <h2>Transportation plans</h2>{records.map((r) => item(r, r.order?.orderNumber || r.orderId, `${r.destination} · ${r.vehicleNumber || "Vehicle pending"} · ETA ${r.estimatedArrival ? new Date(r.estimatedArrival).toLocaleString("en-IN") : "Not set"}`))}
      </>}
      {section === "discounts" && <>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ name: field(f,"name"), category: field(f,"category") || undefined, deliveryPincodes: field(f,"pincodes").split(/[ ,]+/).filter(Boolean), minimumQuantity: f.get("minimum") ? Number(f.get("minimum")) : undefined, percentageOff: Number(f.get("percentage")), fixedAmountOff: Number(f.get("fixed")), priority: Number(f.get("priority")), isActive: f.get("active") === "on" }))}>
          <h2>Configure an automatic quote discount</h2><div className="bc-fields"><label>Rule name<input name="name" required/></label><label>Category (optional)<input name="category"/></label><label>Delivery PIN codes<input name="pincodes" placeholder="201301, 201310"/></label><label>Minimum quantity<input name="minimum" type="number" min="0.001" step="0.001"/></label><label>Discount percent<input name="percentage" type="number" min="0" max="100" step="0.01" defaultValue="0"/></label><label>Fixed discount per item (₹)<input name="fixed" type="number" min="0" step="0.01" defaultValue="0"/></label><label>Priority<input name="priority" type="number" min="0" defaultValue="0"/></label><label className="bc-check"><input name="active" type="checkbox"/> Apply to new quotations</label></div><button className="bc-primary" disabled={busy}>Save discount rule</button>
        </form>
        <h2>Discount rules</h2>{records.map((r) => item(r, r.name, `${r.percentageOff}% + ₹${r.fixedAmountOff} · ${r.category || "All categories"} · ${(r.deliveryPincodes || []).join(", ") || "All service areas"}`))}
      </>}
      {section === "followups" && <>
        <p className="bc-helper">Schedule customer reminders for quotations. WhatsApp and email jobs run through the configured notification provider.</p>
        <h2>Quotations</h2>{records.map((quote) => <article className="business-record bc-record-block" key={quote.id}><div><strong>{quote.quoteNumber} · {quote.customerName}</strong><p>{quote.status} · ₹{Number(quote.totalAmount).toLocaleString("en-IN")}</p></div><form className="bc-inline-form" onSubmit={(e) => submit(e, (f) => ({ channel: field(f,"channel"), scheduledAt: new Date(String(f.get("scheduledAt"))).toISOString(), notes: field(f,"notes") || undefined }), `/quotes/${quote.id}/followups`)}><select name="channel"><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="INTERNAL">Internal task</option></select><input name="scheduledAt" type="datetime-local" required/><input name="notes" placeholder="Message context"/><button className="bc-button">Schedule follow-up</button></form>{quote.followups?.map((f: any) => <div className="business-candidate" key={f.id}><span>{f.channel} · {new Date(f.scheduledAt).toLocaleString("en-IN")} · {f.status}</span>{f.status === "SCHEDULED" && <button className="bc-button" onClick={() => void mutate(`/quotes/${quote.id}/followups/${f.id}`, "PATCH", { status: "CANCELLED" })}>Cancel</button>}</div>)}</article>)}
      </>}
      {section === "blogs" && <>
        <form key={editingBlog?.id || "new-blog"} className="bc-form" onSubmit={(e) => { const editing = editingBlog; void submit(e, (f) => ({ title: field(f,"title"), slug: field(f,"slug").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""), summary: field(f,"summary"), body: field(f,"body"), featuredImageUrl: field(f,"image") || null, authorName: field(f,"author") || undefined, status: field(f,"status") }), editing ? `/admin/blogs/${editing.id}` : active.endpoint, editing ? "PATCH" : "POST").then((saved) => { if (saved) setEditingBlog(null); }); }}>
          <h2>{editingBlog ? "Edit article" : "Write a blog post"}</h2><div className="bc-fields"><label>Title<input name="title" required minLength={3} defaultValue={editingBlog?.title}/></label><label>URL slug<input name="slug" required placeholder="choosing-cement" defaultValue={editingBlog?.slug}/></label><label>Author<input name="author" defaultValue={editingBlog?.authorName || ""}/></label><label>Featured image URL<input name="image" type="url" defaultValue={editingBlog?.featuredImageUrl || ""}/></label><label>Publish status<select name="status" defaultValue={editingBlog?.status || "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Publish on website</option><option value="ARCHIVED">Archived</option></select></label><label className="bc-wide">Short summary<textarea name="summary" required minLength={10} defaultValue={editingBlog?.summary}/></label><label className="bc-wide">Article content<textarea name="body" rows={8} required minLength={20} defaultValue={editingBlog?.body}/></label></div><button className="bc-primary" disabled={busy}>{editingBlog ? "Save changes" : "Save article"}</button>{editingBlog && <button className="bc-button" type="button" onClick={() => setEditingBlog(null)}>Cancel edit</button>}
        </form>
        <h2>Articles</h2>{records.map((r) => <article className="business-record" key={r.id}><div><strong>{r.title}</strong><p>{r.slug}</p><small>{r.status}</small></div><button className="bc-button" onClick={() => setEditingBlog(r)}>Edit</button>{r.status === "PUBLISHED" ? <button className="bc-button" onClick={() => void mutate(`/admin/blogs/${r.id}`, "PATCH", { status: "DRAFT" })}>Unpublish</button> : <button className="bc-button" onClick={() => void mutate(`/admin/blogs/${r.id}`, "PATCH", { status: "PUBLISHED" })}>Publish</button>}{r.status !== "ARCHIVED" && <button className="bc-button" onClick={() => void mutate(`/admin/blogs/${r.id}`, "DELETE", {})}>Archive</button>}</article>)}
      </>}
      {section === "experts" && <>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ name: field(f,"name"), serviceType: field(f,"service"), expertise: field(f,"expertise"), phone: field(f,"phone") || undefined, email: field(f,"email") || undefined, city: field(f,"city") || undefined, description: field(f,"description") || undefined, imageUrl: field(f,"image") || undefined, servicePincodes: field(f,"pincodes").split(/[ ,]+/).filter(Boolean), isPublished: f.get("published") === "on" }))}>
          <h2>Add a professional or service provider</h2><div className="bc-fields"><label>Name<input name="name" required/></label><label>Service type<input name="service" required/></label><label>Expertise<input name="expertise" required/></label><label>Phone<input name="phone" inputMode="numeric"/></label><label>Email<input name="email" type="email"/></label><label>City<input name="city"/></label><label>PIN codes<input name="pincodes"/></label><label>Image URL<input name="image" type="url"/></label><label className="bc-wide">Description<textarea name="description"/></label><label className="bc-check"><input name="published" type="checkbox"/> Show on public website</label></div><button className="bc-primary" disabled={busy}>Save provider</button>
        </form>
        <h2>Directory</h2>{records.map((r) => <article className="business-record" key={r.id}><div><strong>{r.name}</strong><p>{r.serviceType} · {r.expertise}</p><small>{r.isPublished ? "Public" : "Hidden"}</small></div><button className="bc-button" onClick={() => void mutate(`/admin/experts/${r.id}`, "PATCH", { isPublished: !r.isPublished })}>{r.isPublished ? "Hide listing" : "Publish listing"}</button></article>)}
      </>}
      {section === "commissions" && <>
        <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ beneficiaryName: field(f,"name"), beneficiaryPhone: field(f,"phone") || undefined, basisAmount: Number(f.get("basis")), ratePct: Number(f.get("rate")), notes: field(f,"notes") || undefined }))}>
          <h2>Record a commission</h2><div className="bc-fields"><label>Beneficiary name<input name="name" required/></label><label>Phone<input name="phone" inputMode="numeric"/></label><label>Basis amount (₹)<input name="basis" type="number" min="0" step="0.01" required/></label><label>Rate (%)<input name="rate" type="number" min="0" max="100" step="0.01" required/></label><label className="bc-wide">Notes<input name="notes"/></label></div><p className="bc-helper">Commission rules are set per record until eligibility and approval policy are confirmed.</p><button className="bc-primary" disabled={busy}>Submit for review</button>
        </form>
        <h2>Commission records</h2>{records.map((r) => <article className="business-record" key={r.id}><div><strong>{r.beneficiaryName} · ₹{Number(r.amount).toLocaleString("en-IN")}</strong><p>{r.ratePct}% of ₹{Number(r.basisAmount).toLocaleString("en-IN")}</p><small>{r.status}</small></div>{r.status === "PENDING_REVIEW" && <button className="bc-button" onClick={() => void mutate(`/commissions/${r.id}/approve`, "POST", {})}>Approve</button>}{r.status === "APPROVED" && <button className="bc-button" onClick={() => void mutate(`/commissions/${r.id}/pay`, "POST", {})}>Mark paid</button>}</article>)}
      </>}
      {section === "loyalty" && settings && <form className="bc-form" onSubmit={(e) => submit(e, (f) => ({ enabled: f.get("enabled") === "on", pointsPer100Inr: Number(f.get("rate")), minimumOrderValueInr: Number(f.get("minimum")), redemptionValuePerPoint: Number(f.get("value")), minimumRedemptionPoints: Number(f.get("redeem")), expiryAfterDays: f.get("expiry") ? Number(f.get("expiry")) : null }), active.endpoint, "PUT")}>
        <h2>Customer rewards settings</h2><p className="bc-helper">Points are credited after delivery. Set the commercial rules agreed with the client before enabling the program.</p><div className="bc-fields"><label>Points earned per ₹100<input name="rate" type="number" min="0" step="0.001" defaultValue={text(settings.pointsPer100Inr)}/></label><label>Minimum qualifying order (₹)<input name="minimum" type="number" min="0" step="0.01" defaultValue={text(settings.minimumOrderValueInr)}/></label><label>Redemption value per point (₹)<input name="value" type="number" min="0" step="0.0001" defaultValue={text(settings.redemptionValuePerPoint)}/></label><label>Minimum redemption points<input name="redeem" type="number" min="0" step="1" defaultValue={settings.minimumRedemptionPoints}/></label><label>Points expire after (days)<input name="expiry" type="number" min="1" defaultValue={text(settings.expiryAfterDays)}/></label><label className="bc-check"><input name="enabled" type="checkbox" defaultChecked={settings.enabled}/> Enable rewards</label></div><button className="bc-primary" disabled={busy}>Save program settings</button>
      </form>}
    </main>
  </div>;
}
