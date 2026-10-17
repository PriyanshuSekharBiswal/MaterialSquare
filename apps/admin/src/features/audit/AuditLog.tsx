import { useEffect, useState, type FormEvent } from "react";
import { formatEnumLabel } from "../../utils/formatEnumLabel";

type Entry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  metadata: unknown;
  staff: { name: string; role: string } | null;
};
type Page = { items: Entry[]; total: number; page: number; pageSize: number };
type Filters = {
  actorScope: "all" | "mine";
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
};

function labelForKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
}

function humanizeCode(value: string) {
  return formatEnumLabel(value);
}

function scalarLabel(value: unknown) {
  if (value === null || value === undefined || value === "") return "(empty)";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/.test(value)
      ? formatEnumLabel(value)
      : value;
  }
  if (typeof value === "number") return String(value);
  return null;
}

function AuditValue({ value }: { value: unknown }) {
  const scalar = scalarLabel(value);
  if (typeof value === "string" && /^[\s]*[\[{]/.test(value)) {
    try {
      return <AuditValue value={JSON.parse(value)} />;
    } catch {
      // Preserve strings that only happen to start with a bracket.
    }
  }
  if (scalar !== null) return <span className="audit-metadata-value">{scalar}</span>;
  if (Array.isArray(value) && value.every((item) => scalarLabel(item) !== null)) {
    return (
      <span className="audit-metadata-value">
        {value.map((item) => scalarLabel(item)).join(", ") || "(none)"}
      </span>
    );
  }
  const count = Array.isArray(value) ? value.length : Object.keys(value as object).length;
  const label = Array.isArray(value) ? `${count} ${count === 1 ? "item" : "items"}` : "View values";
  return (
    <details className="audit-nested-details">
      <summary>{label}</summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function AuditMetadata({ metadata }: { metadata: unknown }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return <AuditValue value={metadata} />;

  const values = metadata as Record<string, unknown>;
  const changes = Array.isArray(values.changes)
    ? values.changes.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
  const otherValues = Object.entries(values).filter(([key]) => key !== "changes");

  return (
    <div className="audit-metadata-content">
      {changes.length > 0 && (
        <details className="audit-changes-details">
          <summary>{changes.length} {changes.length === 1 ? "field changed" : "fields changed"}</summary>
          <div className="audit-change-list">
            {changes.map((change, index) => (
              <article className="audit-change-card" key={`${String(change.field || "field")}-${index}`}>
                <strong>{labelForKey(String(change.field || "Field"))}</strong>
                <div><span>Before</span><AuditValue value={change.before} /></div>
                <div><span>After</span><AuditValue value={change.after} /></div>
              </article>
            ))}
          </div>
        </details>
      )}
      {otherValues.length > 0 && (
        <dl className="audit-metadata-grid">
          {otherValues.map(([key, value]) => (
            <div className="audit-metadata-item" key={key}>
              <dt>{labelForKey(key)}</dt>
              <dd><AuditValue value={value} /></dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AuditLog({ token, revision }: { token: string; revision: number }) {
  const [filters, setFilters] = useState<Filters>({
    actorScope: new URLSearchParams(window.location.search).get("auditScope") === "all" ? "all" : "mine",
    from: new URLSearchParams(window.location.search).get("auditFrom") || "",
    to: new URLSearchParams(window.location.search).get("auditTo") || "",
    action: new URLSearchParams(window.location.search).get("auditAction") || "",
    entityType: new URLSearchParams(window.location.search).get("auditEntityType") || "",
    entityId: new URLSearchParams(window.location.search).get("auditEntityId") || "",
  });
  const [page, setPage] = useState(() => Math.max(1, Number(new URLSearchParams(window.location.search).get("auditPage")) || 1));
  const [result, setResult] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const values: Array<[string, string]> = [
      ["auditScope", filters.actorScope === "mine" ? "mine" : "all"],
      ["auditFrom", filters.from], ["auditTo", filters.to], ["auditAction", filters.action],
      ["auditEntityType", filters.entityType], ["auditEntityId", filters.entityId],
    ];
    for (const [key, value] of values) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    if (page > 1) url.searchParams.set("auditPage", String(page));
    else url.searchParams.delete("auditPage");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filters, page]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setResult(null);
    const params = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(filters))
      if (value) params.set(key, value);
    async function load() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/admin/audit?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Could not load audit records.");
        const data: Page = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load audit records.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [token, filters, page, revision]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFilters({
      from: String(data.get("from") || ""),
      to: String(data.get("to") || ""),
      actorScope: data.get("actorScope") === "all" ? "all" : "mine",
      action: String(data.get("action") || "").trim(),
      entityType: String(data.get("entityType") || "").trim(),
      entityId: String(data.get("entityId") || "").trim(),
    });
    setPage(1);
  }
  return (
    <section className="audit-log-page" aria-label="Audit log records">
      <form onSubmit={search} className="filter-bar audit-log-filter-form">
        <label>
          Activity by
          <select name="actorScope" value={filters.actorScope} onChange={(event) => {
            setFilters((current) => ({ ...current, actorScope: event.target.value === "all" ? "all" : "mine" }));
            setPage(1);
          }}>
            <option value="mine">My actions</option>
            <option value="all">All staff</option>
          </select>
        </label>
        <label>
          From date (IST)
          <input name="from" type="date" defaultValue={filters.from} />
        </label>
        <label>
          Through date (IST)
          <input name="to" type="date" defaultValue={filters.to} />
        </label>
        <label>
          Action
          <input name="action" maxLength={100} defaultValue={filters.action} />
        </label>
        <label>
          Entity type
          <input name="entityType" maxLength={100} defaultValue={filters.entityType} />
        </label>
        <label>
          Entity reference
          <input name="entityId" maxLength={200} defaultValue={filters.entityId} />
        </label>
        <div className="audit-log-filter-actions">
          <button className="btn-sm btn-secondary btn-orange-outline" disabled={loading}>
            Apply filters
          </button>
        </div>
      </form>
      {loading && <p role="status">Loading audit records…</p>}
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <div className="audit-log-results-heading">
            <p><strong>{result.total}</strong> {filters.actorScope === "mine" ? "actions by you" : "recorded actions"}</p>
          </div>
          {result.items.length === 0 ? (
            <p className="empty">
              {filters.actorScope === "mine" ? "No actions by you match these filters. Choose All staff to review other activity." : "No audit records match these filters."}
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td>
                        {entry.staff
                          ? `${entry.staff.name} · ${humanizeCode(entry.staff.role)}`
                          : "System / former staff"}
                      </td>
                      <td>{humanizeCode(entry.action)}</td>
                      <td>
                        {humanizeCode(entry.entityType)}
                        <small>{entry.entityId}</small>
                      </td>
                      <td>
                        {entry.metadata !== null && (
                          <details className="audit-entry-details">
                            <summary>View details</summary>
                            <AuditMetadata metadata={entry.metadata} />
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {result.items.length > 0 && <nav className="pagination recent-pagination recent-pagination-outside" aria-label="Audit log pages">
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </button>
            <span aria-current="page">Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
            <button
              type="button"
              className="btn-sm btn-secondary"
              disabled={page * result.pageSize >= result.total || loading}
              onClick={() => setPage((value) => Math.min(Math.ceil(result.total / result.pageSize), value + 1))}
            >
              Next
            </button>
          </nav>}
        </>
      )}
    </section>
  );
}
