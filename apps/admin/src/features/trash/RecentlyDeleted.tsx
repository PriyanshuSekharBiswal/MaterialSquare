import { useCallback, useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";

type DeletedRecord = {
  id: string;
  entityType: "CATALOG_PRODUCT" | "SUPPLIER" | "SUPPLIER_PRODUCT" | "STAFF_USER";
  entityId: string;
  displayName: string;
  deletedByName: string;
  deletedAt: string;
  expiresAt: string;
  metadata?: Record<string, unknown> | null;
};

const labels: Record<DeletedRecord["entityType"], string> = {
  CATALOG_PRODUCT: "Product",
  SUPPLIER: "Supplier",
  SUPPLIER_PRODUCT: "Supplier product",
  STAFF_USER: "Staff account",
};

export default function RecentlyDeleted({
  token,
  onSignOut,
}: {
  token: string;
  onSignOut: () => void;
}) {
  const [records, setRecords] = useState<DeletedRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(
    async <T,>(path: string, method = "GET"): Promise<T> => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(65000),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok)
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Could not complete this action.",
        );
      return data as T;
    },
    [token, onSignOut],
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setRecords(await request<DeletedRecord[]>("/admin/recently-deleted"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load deleted items.");
    } finally {
      setBusy(false);
    }
  }, [request]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function restore(record: DeletedRecord) {
    const expires = new Date(record.expiresAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!(await confirmAdminAction({
      title: `Restore “${record.displayName}”?`,
      message: `${labels[record.entityType]} will be available in the workspace again. This recovery option expires on ${expires}.`,
      confirmLabel: "Restore item",
    }))) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/admin/recently-deleted/${record.id}/restore`, "POST");
      setNotice(`“${record.displayName}” was restored.`);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore this item.");
      setBusy(false);
    }
  }

  return (
    <section className="panel-card panel-body recently-deleted">
      <header className="recently-deleted-header">
        <div>
          <span className="eyebrow">RECOVERY & RECORD HISTORY</span>
          <h2><Trash2 size={20} /> Recently deleted</h2>
          <p>Deleted items stay here for 30 days. Restore actions are recorded in the audit log.</p>
        </div>
        <button className="btn-sm btn-secondary" disabled={busy} onClick={() => void refresh()}>
          <RefreshCw size={15} className={busy ? "spin" : ""} /> Refresh
        </button>
      </header>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="saved-notice" role="status">{notice}</p>}
      {!records.length && !busy && !error && (
        <div className="recently-deleted-empty">
          <Trash2 size={24} />
          <strong>Nothing to recover</strong>
          <span>Items you delete will appear here for 30 days.</span>
        </div>
      )}
      <div className="recently-deleted-list">
        {records.map((record) => (
          <article className="recently-deleted-row" key={record.id}>
            <div className="recently-deleted-icon"><Trash2 size={18} /></div>
            <div className="recently-deleted-details">
              <div className="recently-deleted-title">
                <strong>{record.displayName}</strong>
                <span>{labels[record.entityType]}</span>
              </div>
              <p>
                Deleted by {record.deletedByName} · {new Date(record.deletedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              {record.entityType === "SUPPLIER_PRODUCT" && typeof record.metadata?.supplierName === "string" && (
                <small>Supplier: {record.metadata.supplierName}</small>
              )}
              <small>
                Available to restore until {new Date(record.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </small>
            </div>
            <button className="btn-sm btn-secondary" disabled={busy} onClick={() => void restore(record)}>
              <RotateCcw size={15} /> Restore
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
