import { useEffect, useState, type FormEvent } from "react";

type Entry = {
  id: string;
  type: string;
  runAt: string;
  status: string;
  skipReason: string | null;
};
type Page = { items: Entry[]; total: number; pageSize: number };
type Readiness = {
  ready: boolean;
  missingRequired: string[];
  webhookTokenConfigured: boolean;
};
export default function NotificationStatus({ token, revision }: { token: string; revision: number }) {
  const [filters, setFilters] = useState({ status: "", type: "" });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [readinessError, setReadinessError] = useState("");
  const [readinessRevision, setReadinessRevision] = useState(0);
  const [checkingReadiness, setCheckingReadiness] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    async function loadReadiness() {
      setCheckingReadiness(true);
      setReadinessError("");
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "/api"}/admin/notifications/readiness`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "The API does not recognize the notification setup check (404). The API service may need its latest deployment.",
            );
          }
          throw new Error(
            `Could not check notification setup (HTTP ${response.status}).`,
          );
        }
        const data: Readiness = await response.json();
        if (!controller.signal.aborted) setReadiness(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setReadinessError(
            cause instanceof TypeError
              ? "Could not reach the API to check notification setup. Check the API service and try again."
              : cause instanceof Error
                ? cause.message
                : "Could not check notification setup.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setCheckingReadiness(false);
      }
    }
    void loadReadiness();
    return () => controller.abort();
  }, [token, readinessRevision]);
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
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "The API does not recognize the notification status endpoint (404). The API service may need its latest deployment.",
            );
          }
          throw new Error(
            `Could not load notification status (HTTP ${response.status}).`,
          );
        }
        const data: Page = await response.json();
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof TypeError
              ? "Could not reach the API to load notification status. Check the API service and try again."
              : cause instanceof Error
                ? cause.message
                : "Could not load notification status.",
          );
        }
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
    <section className="notification-status-page">
      <h2>Notification status</h2>
      <p>
        Queued jobs await the configured provider. Delivered means the provider
        accepted the request; recipient delivery is not confirmed here.
      </p>
      {readinessError ? (
        <div>
          <p role="status">{readinessError}</p>
          <button
            className="btn-sm"
            disabled={checkingReadiness}
            onClick={() => setReadinessRevision((value) => value + 1)}
          >
            {checkingReadiness ? "Checking setup…" : "Retry setup check"}
          </button>
        </div>
      ) : null}
      {readiness && !readiness.ready ? (
        <aside className="notification-readiness-notice" role="status">
          <strong>Notification delivery is not configured.</strong>
          <p>
            Jobs stay pending until an administrator configures:{" "}
            {readiness.missingRequired.join(", ")}.
            {readiness.webhookTokenConfigured
              ? ""
              : " The optional NOTIFICATION_WEBHOOK_TOKEN is also not set."}
          </p>
          <p>Secret values are never shown in this screen.</p>
        </aside>
      ) : readiness?.ready ? (
        <p role="status">Notification worker configuration is present.</p>
      ) : null}
      <form onSubmit={applyFilters} className="filter-bar notification-filter-form">
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
        <div className="notification-filter-actions">
          <button className="btn-sm btn-secondary btn-orange-outline">Filter notifications</button>
        </div>
      </form>
      {error ? (
        <p role="alert">{error}</p>
      ) : !result ? (
        <p role="status">Loading notifications…</p>
      ) : (
        <>
          <div className="notification-results-heading">
            <p><strong>{result.total}</strong> notification jobs</p>
          </div>
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
          <div className="pagination notification-pagination">
            <button
              className="btn-sm btn-secondary"
              disabled={page === 1 || !result.total}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
            <button
              className="btn-sm btn-secondary"
              disabled={page * result.pageSize >= result.total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
