import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Package, Pencil, Plus, RefreshCw, Upload } from "lucide-react";
import type { RecentChanges } from "./contracts";

type Props = {
  token: string;
  role: string;
  onOpenCatalogue: () => void;
  onOpenContent: () => void;
  onOpenSales: () => void;
};

function changeValue(field: string, value: unknown) {
  if (field === "isActive") return value ? "Active" : "Disabled";
  if (field === "role") {
    const roles: Record<string, string> = {
      ADMIN: "Administrator",
      SALES_MANAGER: "Sales & customer support",
      CATALOG_MANAGER: "Catalogue & pricing manager",
      PROCUREMENT_HEAD: "Procurement & suppliers",
      DISPATCH_OFFICER: "Dispatch & transportation",
      ACCOUNTS_MANAGER: "Accounts & finance",
      CONTENT_MANAGER: "Website content manager",
    };
    return roles[String(value)] || String(value || "(empty)");
  }
  return String(value ?? "(empty)");
}

export default function RecentActivity({
  token,
  role,
  onOpenCatalogue,
  onOpenContent,
  onOpenSales,
}: Props) {
  const [data, setData] = useState<RecentChanges | null>(null);
  const [category, setCategory] = useState("All activity");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void fetch(`${import.meta.env.VITE_API_URL || "/api"}/admin/audit/recent`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Recent activity could not be loaded.");
        return (await response.json()) as RecentChanges;
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Recent activity could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, refresh]);

  const categories = useMemo(
    () => ["All activity", ...(data?.categories || [])],
    [data?.categories],
  );
  const counts = useMemo(() => {
    const items = data?.items || [];
    return new Map(
      categories.map((name) => [
        name,
        name === "All activity"
          ? items.length
          : items.filter((item) => item.category === name).length,
      ]),
    );
  }, [categories, data?.items]);
  const items = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.items || []).filter((item) => {
      const categoryMatches = category === "All activity" || item.category === category;
      const searchMatches = !query || [
        item.title,
        item.entityLabel,
        item.actionLabel,
        item.staff?.name,
        item.entityId,
        ...(item.changedFields || []),
        ...(item.changes || []).flatMap((change) => [String(change.before), String(change.after)]),
      ].some((value) => value?.toLowerCase().includes(query));
      return categoryMatches && searchMatches;
    });
  }, [category, data?.items, search]);

  const canOpenCatalogue = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "CATALOG_MANAGER"].includes(role);
  const canOpenContent = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(role);
  const canOpenSales = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "PROCUREMENT_HEAD", "DISPATCH_OFFICER", "ACCOUNTS_MANAGER"].includes(role);

  const openDestination = useCallback((entityType: string) => {
    if (["CATALOG_PRODUCT", "PRODUCT_SKU"].includes(entityType) && canOpenCatalogue) onOpenCatalogue();
    else if (["MEDIA_ASSET", "WEBSITE_CONTENT", "WEBSITE_BRANDS", "BLOG_POST", "EXPERT_ADVISOR"].includes(entityType) && canOpenContent) onOpenContent();
    else if (["QUOTATION", "RFQ", "ORDER", "STAFF_ENQUIRY"].includes(entityType) && canOpenSales) onOpenSales();
  }, [canOpenCatalogue, canOpenContent, canOpenSales, onOpenCatalogue, onOpenContent, onOpenSales]);

  return (
    <section className="panel-card recent-changes-panel recent-activity-page" aria-labelledby="recent-activity-title">
      <div className="recent-changes-header">
        <div>
          <span className="recent-changes-eyebrow">TEAM ACTIVITY</span>
          <h2 id="recent-activity-title">Recent activity</h2>
          <p>Products, images, website content, customer work, procurement and team changes.</p>
        </div>
        <div className="recent-activity-tools">
          <span className="recent-changes-range"><Clock3 size={15} aria-hidden="true" /> Kept here for 7 days</span>
          <button className="btn-sm btn-secondary" type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading}>
            <RefreshCw size={14} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>
      <div className="recent-activity-controls">
        <div className="recent-changes-filters" role="group" aria-label="Filter recent activity">
          {categories.map((name) => (
            <button key={name} className={category === name ? "recent-filter active" : "recent-filter"} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>
              {name}<span>{counts.get(name) || 0}</span>
            </button>
          ))}
        </div>
        <label className="recent-activity-search">
          <span>Search recent changes</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Product, staff member, action…" />
        </label>
      </div>
      {loading && <p className="recent-changes-message" role="status">Loading recent activity…</p>}
      {error && <p className="recent-changes-message" role="alert">{error}</p>}
      {!loading && !error && data && items.length === 0 && (
        <div className="recent-changes-empty"><Package size={20} aria-hidden="true" /><span>{data.items.length ? "No changes match these filters." : "No admin changes recorded in the past 7 days."}</span></div>
      )}
      {!loading && !error && items.length > 0 && (
        <ul className="recent-changes-list recent-activity-list">
          {items.map((item) => {
            const Icon = item.action.includes("UPLOADED") ? Upload : item.action.includes("CREATED") || item.action.includes("PUBLISHED") ? Plus : Pencil;
            const canOpen = (["CATALOG_PRODUCT", "PRODUCT_SKU"].includes(item.entityType) && canOpenCatalogue)
              || (["MEDIA_ASSET", "WEBSITE_CONTENT", "WEBSITE_BRANDS", "BLOG_POST", "EXPERT_ADVISOR"].includes(item.entityType) && canOpenContent)
              || (["QUOTATION", "RFQ", "ORDER", "STAFF_ENQUIRY"].includes(item.entityType) && canOpenSales);
            return (
              <li className="recent-change-item" key={item.id}>
                <span className="recent-change-icon"><Icon size={16} aria-hidden="true" /></span>
                <div className="recent-change-copy">
                  <strong>{item.title || item.entityLabel}</strong>
                  <span>{item.actionLabel} · {item.entityLabel}</span>
                  {item.changes?.length ? item.changes.map((change) => (
                    <small className="recent-change-diff" key={`${change.field}-${String(change.before)}-${String(change.after)}`}>
                      {change.field === "isActive" ? "Account status" : change.field === "role" ? "Role" : change.field}: {changeValue(change.field, change.before)} → {changeValue(change.field, change.after)}
                    </small>
                  )) : item.changedFields.length > 0 && <small>Changed: {item.changedFields.join(", ")}</small>}
                  <small>{item.staff?.name || "System"}{item.staff?.role ? ` · ${item.staff.role.replaceAll("_", " ").toLowerCase()}` : ""}</small>
                  {canOpen && <button type="button" className="recent-change-open" onClick={() => openDestination(item.entityType)}>Open related workspace</button>}
                </div>
                <time className="recent-change-meta" dateTime={item.createdAt} title={new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}>
                  {new Date(item.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
      {data && <div className="recent-changes-footer"><span>Showing {items.length} of {data.total} recorded changes from the past 7 days{data.total > data.limit ? ` · latest ${data.limit}` : ""}.</span></div>}
    </section>
  );
}
