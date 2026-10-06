import { Clock3, FileText, Package, Pencil, Plus, Upload } from "lucide-react";
import type { RecentChanges, Stats, WebsiteAnalytics } from "./contracts";

type WorkspaceOverviewProps = {
  stats: Stats | null;
  websiteAnalytics: WebsiteAnalytics | null;
  recentChanges: RecentChanges | null;
  recentChangesError: string;
  staffRole: string;
  onViewCustomers: () => void;
  onViewAudit: () => void;
  onOpenCatalogue: () => void;
  onOpenContent: () => void;
  onRecordEnquiry: () => void;
};

export default function WorkspaceOverview({
  stats,
  websiteAnalytics,
  recentChanges,
  recentChangesError,
  staffRole,
  onViewCustomers,
  onViewAudit,
  onOpenCatalogue,
  onOpenContent,
  onRecordEnquiry,
}: WorkspaceOverviewProps) {
  if (!stats) return null;

  return (
    <>
      <div className="kpi-grid">
        {[
          ["Customer records", stats.customers],
          ["New records · 30 days", stats.newCustomers30Days],
          ["Open follow-ups", stats.openFollowups],
          ["Closed follow-ups", stats.closedFollowups],
        ].map(([label, value]) => (
          <article className="kpi-card" key={label}>
            <h2>{label}</h2>
            <p className="kpi-value">{value}</p>
          </article>
        ))}
      </div>
      {websiteAnalytics && (
        <section className="panel-card website-analytics">
          <div className="website-analytics-head">
            <div>
              <h2>Website activity · last {websiteAnalytics.days} days</h2>
              <p>
                Aggregate page and product interactions; visitor identities are
                not collected.
              </p>
            </div>
            <span className="analytics-range">30 days</span>
          </div>
          <div className="website-analytics-kpis">
            {[
              ["Page views", websiteAnalytics.totals.pageViews],
              ["Product detail opens", websiteAnalytics.totals.productViews],
              ["Added to material list", websiteAnalytics.totals.addToList],
              [
                "WhatsApp/email link clicks",
                websiteAnalytics.totals.requestHandoffs,
              ],
            ].map(([label, value]) => (
              <div className="website-analytics-kpi" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="website-analytics-details">
            <div className="analytics-chart-wrap">
              <h3>Daily page views</h3>
              {websiteAnalytics.totals.pageViews ? (
                <div
                  className="analytics-bars"
                  role="img"
                  aria-label="Daily page views over the last 30 days"
                >
                  {websiteAnalytics.daily.map((day) => {
                    const max = Math.max(
                      1,
                      ...websiteAnalytics.daily.map((item) => item.pageViews),
                    );
                    return (
                      <div
                        className="analytics-bar-column"
                        key={day.date}
                        title={`${day.date}: ${day.pageViews} page views`}
                      >
                        <span
                          style={{
                            height: `${Math.max(day.pageViews ? 4 : 0, (day.pageViews / max) * 100)}%`,
                          }}
                        />
                        <small>
                          {new Date(`${day.date}T00:00:00`).getDate()}
                        </small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">
                  Activity will appear here after customers browse the site.
                </p>
              )}
            </div>
            <div className="analytics-ranking">
              <h3>Popular pages</h3>
              {websiteAnalytics.topPages.length ? (
                websiteAnalytics.topPages.map((item) => (
                  <div key={item.page}>
                    <span>{item.page.replace(/-/g, " ")}</span>
                    <strong>{item.views}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No page activity yet.</p>
              )}
            </div>
            <div className="analytics-ranking">
              <h3>Popular products</h3>
              {websiteAnalytics.topProducts.length ? (
                websiteAnalytics.topProducts.map((item) => (
                  <div key={item.id}>
                    <span>{item.name}</span>
                    <strong>{item.views}</strong>
                  </div>
                ))
              ) : (
                <p className="muted">No product views yet.</p>
              )}
            </div>
          </div>
          <p className="analytics-privacy-note">{websiteAnalytics.privacy}</p>
        </section>
      )}
      <section className="panel-card recent-changes-panel" aria-labelledby="recent-changes-heading">
        <div className="recent-changes-header">
          <div>
            <span className="recent-changes-eyebrow">TEAM ACTIVITY</span>
            <h2 id="recent-changes-heading">Recent changes</h2>
            <p>Products, images and website content changed in the last 7 days.</p>
          </div>
          <span className="recent-changes-range"><Clock3 size={15} aria-hidden="true" /> Last 7 days</span>
        </div>
        {recentChangesError ? (
          <p className="recent-changes-message" role="status">{recentChangesError}</p>
        ) : !recentChanges ? (
          <p className="recent-changes-message" role="status">Loading recent changes…</p>
        ) : recentChanges.items.length === 0 ? (
          <div className="recent-changes-empty">
            <Package size={20} aria-hidden="true" />
            <span>No product or website changes recorded in the past 7 days.</span>
          </div>
        ) : (
          <ul className="recent-changes-list">
            {recentChanges.items.map((change) => {
              const label = change.action.includes("CREATED") || change.action.includes("UPLOADED") || change.action.includes("PUBLISHED")
                ? "Added or published"
                : change.action.includes("ARCHIVED")
                  ? "Archived"
                  : "Edited";
              const Icon = change.action.includes("CREATED") || change.action.includes("PUBLISHED")
                ? Plus
                : change.action.includes("UPLOADED")
                  ? Upload
                  : Pencil;
              const catalogueChange = change.entityType === "CATALOG_PRODUCT" || change.entityType === "PRODUCT_SKU";
              const canOpenCatalogue = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "CATALOG_MANAGER"].includes(staffRole);
              const canOpenContent = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"].includes(staffRole);
              return (
                <li className="recent-change-item" key={change.id}>
                  <span className="recent-change-icon"><Icon size={16} aria-hidden="true" /></span>
                  <div className="recent-change-copy">
                    <strong>{change.title}</strong>
                    <span>{label}{change.changedFields.length ? ` · ${change.changedFields.length} ${change.changedFields.length === 1 ? "detail" : "details"} updated` : ""}</span>
                    {change.changedFields.length > 0 && (
                      <small>{change.changedFields.slice(0, 4).map((field) => field.replace(/[._]/g, " ")).join(" · ")}{change.changedFields.length > 4 ? ` +${change.changedFields.length - 4}` : ""}</small>
                    )}
                  </div>
                  <div className="recent-change-meta">
                    <span>{change.staff?.name || "System"}</span>
                    <time dateTime={change.createdAt}>{new Date(change.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
                    {catalogueChange && canOpenCatalogue ? (
                      <button className="recent-change-open" onClick={onOpenCatalogue}>Open catalogue</button>
                    ) : !catalogueChange && canOpenContent ? (
                      <button className="recent-change-open" onClick={onOpenContent}>Open website content</button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="recent-changes-footer">
          <span>This feed shows the latest changes from the past 7 days.</span>
          {(staffRole === "SUPER_ADMIN" || staffRole === "ADMIN") && (
            <button className="recent-changes-link" onClick={onViewAudit}>
              <FileText size={15} aria-hidden="true" /> Open full audit log
            </button>
          )}
        </div>
      </section>
      <section className="panel-card panel-body">
        <h2>Today’s work</h2>
        <p>
          Review customer material lists and record enquiries received through
          WhatsApp, email or phone.
        </p>
        <div className="workspace-actions">
          <button className="btn-sm btn-primary" onClick={onViewCustomers}>
            View customers
          </button>
          <button className="btn-sm btn-secondary" onClick={onRecordEnquiry}>
            Record an enquiry
          </button>
        </div>
        <p className="muted">
          WhatsApp and email conversations are handled outside this workspace.
          Record each follow-up here when your team receives it.
        </p>
      </section>
    </>
  );
}
