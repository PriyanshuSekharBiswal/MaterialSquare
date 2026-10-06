import { useEffect, useState, type FormEvent } from "react";

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
  action: string;
  entityType: string;
  entityId: string;
  from: string;
  to: string;
};

export default function AuditLog({ token }: { token: string }) {
  const [filters, setFilters] = useState<Filters>({
    from: "",
    to: "",
    action: "",
    entityType: "",
    entityId: "",
  });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

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
      action: String(data.get("action") || "").trim(),
      entityType: String(data.get("entityType") || "").trim(),
      entityId: String(data.get("entityId") || "").trim(),
    });
    setPage(1);
  }
  return (
    <section>
      <h2>Audit log</h2>
      <p>
        Recorded staff and system actions. Filters match exact action names and
        entity references.
      </p>
      <form onSubmit={search} className="filter-bar">
        <label>
          From date (IST)
          <input name="from" type="date" />
        </label>
        <label>
          Through date (IST)
          <input name="to" type="date" />
        </label>
        <label>
          Action
          <input name="action" maxLength={100} />
        </label>
        <label>
          Entity type
          <input name="entityType" maxLength={100} />
        </label>
        <label>
          Entity reference
          <input name="entityId" maxLength={200} />
        </label>
        <button className="btn-sm" disabled={loading}>
          Apply filters
        </button>
        <button
          type="button"
          className="btn-sm"
          onClick={() => setRevision((value) => value + 1)}
          disabled={loading}
        >
          Refresh records
        </button>
      </form>
      {loading && <p role="status">Loading audit records…</p>}
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p>{result.total} recorded actions</p>
          {result.items.length === 0 ? (
            <p className="empty">No audit records match these filters.</p>
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
                          ? `${entry.staff.name} · ${entry.staff.role}`
                          : "System / former staff"}
                      </td>
                      <td>{entry.action}</td>
                      <td>
                        {entry.entityType}
                        <small>{entry.entityId}</small>
                      </td>
                      <td>
                        {entry.metadata !== null && (
                          <details>
                            <summary>View details</summary>
                            {entry.entityType === "WEBSITE_CONTENT" &&
                            typeof entry.metadata === "object" &&
                            entry.metadata !== null &&
                            Array.isArray((entry.metadata as { changes?: unknown }).changes) ? (
                              <ul className="audit-change-list">
                                {(entry.metadata as { changes: Array<{ field?: string; before?: string; after?: string }> }).changes.map((change, index) => (
                                  <li key={`${change.field}-${index}`}>
                                    <strong>{(change.field || "Field").replace(/[._]/g, " ")}</strong>
                                    <span>Before: {change.before || "(empty)"}</span>
                                    <span>After: {change.after || "(empty)"}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxWidth: 400 }}>
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            )}
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            className="btn-sm"
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous audit page
          </button>
          <span> Page {page} </span>
          <button
            className="btn-sm"
            disabled={page * result.pageSize >= result.total}
            onClick={() => setPage((value) => value + 1)}
          >
            Next audit page
          </button>
        </>
      )}
    </section>
  );
}
