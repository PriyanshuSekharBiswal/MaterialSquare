import type { Stats, WebsiteAnalytics } from "./contracts";

type WorkspaceOverviewProps = {
  stats: Stats | null;
  websiteAnalytics: WebsiteAnalytics | null;
  onViewCustomers: () => void;
  onRecordEnquiry: () => void;
};

export default function WorkspaceOverview({
  stats,
  websiteAnalytics,
  onViewCustomers,
  onRecordEnquiry,
}: WorkspaceOverviewProps) {
  if (!stats) return null;

  return (
    <>
      <div className="kpi-grid">
        {[
          ["Customer accounts", stats.customers],
          ["New accounts · 30 days", stats.newCustomers30Days],
          ["Active customers · 30 days", stats.activeCustomers30Days],
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
