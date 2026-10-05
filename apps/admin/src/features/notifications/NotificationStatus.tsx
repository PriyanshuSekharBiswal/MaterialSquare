import { useEffect, useState, type FormEvent } from "react";

type Entry = {
  id: string;
  type: string;
  runAt: string;
  status: string;
  skipReason: string | null;
};
type Page = { items: Entry[]; total: number; pageSize: number };
export default function NotificationStatus({ token }: { token: string }) {
  const [filters, setFilters] = useState({ status: "", type: "" });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Page | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    const params = new URLSearchParams({ page: String(page) });
    if (filters.status) params.set("status", filters.status);
    if (filters.type) params.set("type", filters.type);
    async function load() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/admin/notifications?${params}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error("Could not load notification status.");
        const data: Page = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load notification status.",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [page, revision, token, filters]);
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFilters({
      status: String(data.get("status") || ""),
      type: String(data.get("type") || "").trim(),
    });
    setPage(1);
  }
  return (
    <section>
      <h2>Notification status</h2>
      <p>
        Queued jobs await the configured provider. Delivered means the provider
        accepted the request; recipient delivery is not confirmed here.
      </p>
      <form onSubmit={applyFilters} className="filter-bar">
        <label>
          Notification outcome
          <select name="status">
            <option value="">All outcomes</option>
            {["PENDING", "QUEUED", "DELIVERED", "FAILED", "SKIPPED"].map(
              (status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Notification type
          <input name="type" maxLength={100} placeholder="Exact job type" />
        </label>
        <button className="btn-sm">Filter notifications</button>
      </form>
      <button
        className="btn-sm"
        onClick={() => setRevision((value) => value + 1)}
      >
        Refresh notifications
      </button>
      {error ? (
        <p role="alert">{error}</p>
      ) : !result ? (
        <p role="status">Loading notifications…</p>
      ) : (
        <>
          <p>{result.total} notification jobs</p>
          {result.items.length === 0 ? (
            <p className="empty">No notification jobs recorded.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Type</th>
                    <th>Scheduled time</th>
                    <th>Status</th>
                    <th>Skip reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.type}</td>
                      <td>{new Date(item.runAt).toLocaleString("en-IN")}</td>
                      <td>{item.status}</td>
                      <td>{item.skipReason || "—"}</td>
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
            Previous notification page
          </button>
          <span> Page {page} </span>
          <button
            className="btn-sm"
            disabled={page * result.pageSize >= result.total}
            onClick={() => setPage((value) => value + 1)}
          >
            Next notification page
          </button>
        </>
      )}
    </section>
  );
}
