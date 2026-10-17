import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCw } from "lucide-react";
import { formatEnumLabel } from "../../utils/formatEnumLabel";
import "./operational-reports.css";

type ReportType = "sales" | "procurement" | "fulfillment";
type SalesReport = {
  from: string;
  to: string;
  summary: {
    orderCount: number;
    activeOrderCount: number;
    recordedOrderValueInr: number;
    quotationCount: number;
    acceptedQuotationCount: number;
  };
  orders: {
    orderNumber: string;
    status: string;
    createdAt: string;
    recordedValueInr: number;
    itemCount: number;
  }[];
  quotations: {
    quoteNumber: string;
    revisionNumber: number;
    status: string;
    createdAt: string;
    validUntil: string;
    recordedValueInr: number;
    itemCount: number;
  }[];
  orderStatus: { status: string; count: number; recordedValueInr: number }[];
  quotationStatus: {
    status: string;
    count: number;
    recordedValueInr: number;
  }[];
  truncated: boolean;
  rowLimit: number;
  note: string;
};
type ProcurementReport = {
  from: string;
  to: string;
  summary: {
    requestCount: number;
    purchaseOrderCount: number;
    plannedPurchaseValueInr: number;
  };
  requests: {
    requestNumber: string;
    status: string;
    createdAt: string;
    requiredBy: string | null;
    itemCount: number;
    supplierQuoteCount: number;
    purchaseOrderCount: number;
  }[];
  purchaseOrders: {
    purchaseOrderNumber: string;
    requestNumber: string;
    supplierName: string;
    status: string;
    createdAt: string;
    plannedValueInr: number;
  }[];
  requestStatus: { status: string; count: number }[];
  purchaseOrderStatus: {
    status: string;
    count: number;
    plannedValueInr: number;
  }[];
  truncated: boolean;
  rowLimit: number;
};
type FulfillmentReport = {
  from: string;
  to: string;
  summary: {
    orderCount: number;
    deliveryPlanCount: number;
    deliveredOrderCount: number;
  };
  ordersByStatus: { status: string; count: number }[];
  plansByStatus: { status: string; count: number }[];
  deliveries: {
    orderNumber: string;
    orderStatus: string;
    planStatus: string;
    dispatchAt: string | null;
    estimatedArrival: string | null;
    currentLocation: string | null;
    recordedDeliveryCount: number;
  }[];
  truncated: boolean;
  rowLimit: number;
};
type ReportData = SalesReport | ProcurementReport | FulfillmentReport;
type ExportRow = Record<string, string | number | null>;
const ReportPaginationTargetContext = createContext<HTMLElement | null>(null);

function localDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function initialRange() {
  const today = new Date();
  return {
    from: localDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: localDate(today),
  };
}

function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], rows: ExportRow[]) {
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      headers.map((header) => csvCell(row[header] ?? null)).join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const reportTabs: { id: ReportType; label: string; permission: string }[] = [
  { id: "sales", label: "Sales & quotations", permission: "sales" },
  { id: "procurement", label: "Procurement", permission: "procurement" },
  {
    id: "fulfillment",
    label: "Delivery & fulfillment",
    permission: "dispatch",
  },
];

export default function OperationalReports({
  token,
  role,
  onSignOut,
}: {
  token: string;
  role: string;
  onSignOut: () => void;
}) {
  const visibleTabs = reportTabs.filter(({ permission }) =>
    permission === "sales"
      ? ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "ACCOUNTS_MANAGER"].includes(
          role,
        )
      : permission === "procurement"
        ? ["SUPER_ADMIN", "ADMIN", "PROCUREMENT_HEAD"].includes(role)
        : ["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"].includes(role),
  );
  const [reportType, setReportType] = useState<ReportType>(
    visibleTabs[0]?.id || "sales",
  );
  const [range, setRange] = useState(initialRange);
  const [draftRange, setDraftRange] = useState(range);
  const [loadedReport, setLoadedReport] = useState<{
    type: ReportType;
    data: ReportData;
  } | null>(null);
  // A tab switch renders once before effects run. Keep the previous response
  // tagged with its report type so it is never rendered as a different shape.
  const data = loadedReport?.type === reportType ? loadedReport.data : null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paginationTarget, setPaginationTarget] =
    useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visibleTabs.some(({ id }) => id === reportType))
      setReportType(visibleTabs[0]?.id || "sales");
  }, [role, reportType]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(range);
    setLoading(true);
    setError("");
    setLoadedReport(null);
    fetch(
      `${import.meta.env.VITE_API_URL || "/api"}/reports/${reportType}?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (response.status === 401) onSignOut();
        const result = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            typeof result?.message === "string"
              ? result.message
              : "Could not load this report.",
          );
        return result as ReportData;
      })
      .then((result) => {
        if (!controller.signal.aborted)
          setLoadedReport({ type: reportType, data: result });
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load this report.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, reportType, range, onSignOut]);

  const exportRows = useMemo(() => {
    if (!data) return [];
    if (reportType === "sales") {
      const report = data as SalesReport;
      return [
        ...report.orders.map((row) => ({
          recordType: "Order",
          reference: row.orderNumber,
          status: row.status,
          createdAt: row.createdAt,
          recordedValueInr: row.recordedValueInr,
          itemCount: row.itemCount,
          supplier: null,
          deliveryStatus: null,
        })),
        ...report.quotations.map((row) => ({
          recordType: `Quotation revision ${row.revisionNumber}`,
          reference: row.quoteNumber,
          status: row.status,
          createdAt: row.createdAt,
          recordedValueInr: row.recordedValueInr,
          itemCount: row.itemCount,
          supplier: null,
          deliveryStatus: null,
        })),
      ];
    }
    if (reportType === "procurement") {
      const report = data as ProcurementReport;
      return [
        ...report.requests.map((row) => ({
          recordType: "Procurement request",
          reference: row.requestNumber,
          status: row.status,
          createdAt: row.createdAt,
          recordedValueInr: null,
          itemCount: row.itemCount,
          supplier: null,
          deliveryStatus: `${row.supplierQuoteCount} supplier quotes; ${row.purchaseOrderCount} purchase orders`,
        })),
        ...report.purchaseOrders.map((row) => ({
          recordType: "Purchase order",
          reference: row.purchaseOrderNumber,
          status: row.status,
          createdAt: row.createdAt,
          recordedValueInr: row.plannedValueInr,
          itemCount: null,
          supplier: row.supplierName,
          deliveryStatus: row.requestNumber,
        })),
      ];
    }
    return (data as FulfillmentReport).deliveries.map((row) => ({
      recordType: "Delivery plan",
      reference: row.orderNumber,
      status: row.orderStatus,
      createdAt: row.dispatchAt,
      recordedValueInr: null,
      itemCount: row.recordedDeliveryCount,
      supplier: null,
      deliveryStatus: row.planStatus,
    }));
  }, [data, reportType]);

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftRange.from || !draftRange.to || draftRange.from > draftRange.to) {
      setError("Choose a valid start and end date.");
      return;
    }
    setRange({ ...draftRange });
  }

  function exportReport() {
    downloadCsv(
      `material-square-${reportType}-${range.from}-to-${range.to}.csv`,
      [
        "recordType",
        "reference",
        "status",
        "createdAt",
        "recordedValueInr",
        "itemCount",
        "supplier",
        "deliveryStatus",
      ],
      exportRows,
    );
  }

  return (
    <ReportPaginationTargetContext.Provider value={paginationTarget}>
      <div className="operational-reports-shell">
        <section className="panel-card operational-reports">
          <div className="operational-reports-header">
            <div className="report-heading-copy">
              <span>REPORTING &amp; ANALYTICS</span>
              <h2>
                {visibleTabs.find(({ id }) => id === reportType)?.label ||
                  "Operational report"}
              </h2>
              <p>Review operating activity for the selected date range.</p>
            </div>
            <button
              className="btn-sm btn-secondary btn-orange-outline"
              onClick={() => setRange({ ...range })}
              disabled={loading}
            >
              <RefreshCw size={14} /> Refresh report
            </button>
          </div>
          <div className="report-tabs-shell">
            <div
              className="report-tabs"
              role="tablist"
              aria-label="Report category"
            >
              {visibleTabs.map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={reportType === id}
                  className={reportType === id ? "active" : ""}
                  onClick={() => setReportType(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <form className="report-filters" onSubmit={applyRange}>
            <div className="report-filter-fields">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={draftRange.from}
                  onChange={(event) =>
                    setDraftRange({ ...draftRange, from: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={draftRange.to}
                  onChange={(event) =>
                    setDraftRange({ ...draftRange, to: event.target.value })
                  }
                  required
                />
              </label>
            </div>
            <div className="report-filter-actions">
              <button className="btn-sm btn-primary" disabled={loading}>
                Apply dates
              </button>
              <button
                className="btn-sm btn-secondary"
                type="button"
                onClick={exportReport}
                disabled={!data || exportRows.length === 0}
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
            <p className="report-range-note">
              Dates use India Standard Time. Customer contact details are
              excluded.
            </p>
          </form>
          {loading && (
            <p role="status" className="report-loading">
              <RefreshCw size={16} /> Loading report…
            </p>
          )}
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          {data?.truncated && (
            <p role="status" className="report-truncated">
              Showing up to {data.rowLimit} rows per section. Narrow the date
              range to export a smaller complete report.
            </p>
          )}
          {data && reportType === "sales" && (
            <SalesReportView report={data as SalesReport} />
          )}
          {data && reportType === "procurement" && (
            <ProcurementReportView report={data as ProcurementReport} />
          )}
          {data && reportType === "fulfillment" && (
            <FulfillmentReportView report={data as FulfillmentReport} />
          )}
          {exportRows.length > 0 && (
            <p className="report-export-count">
              CSV export includes {exportRows.length} visible records.
            </p>
          )}
        </section>
        <div className="report-pagination-outlet" ref={setPaginationTarget} />
      </div>
    </ReportPaginationTargetContext.Provider>
  );
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString("en-IN") : "—";
}

function SummaryCards({ items }: { items: [string, string | number][] }) {
  return (
    <div className="report-summary-cards">
      {items.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}

const REPORT_PAGE_SIZE = 10;

function ReportPagination({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const paginationTarget = useContext(ReportPaginationTargetContext);
  const pageCount = Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  return (
    total > 0 &&
    paginationTarget &&
    createPortal(
      <nav
        className="pagination recent-pagination recent-pagination-outside report-pagination"
        aria-label="Report table pagination"
      >
        <button
          type="button"
          className="btn-sm btn-secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>
        <span aria-current="page">
          Page {currentPage} of {pageCount}
        </span>
        <button
          type="button"
          className="btn-sm btn-secondary"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </nav>,
      paginationTarget,
    )
  );
}

function SalesReportView({ report }: { report: SalesReport }) {
  const [section, setSection] = useState<"orders" | "quotations">("orders");
  const [page, setPage] = useState(1);
  const rows = section === "orders" ? report.orders : report.quotations;
  const visibleRows = rows.slice(
    (page - 1) * REPORT_PAGE_SIZE,
    page * REPORT_PAGE_SIZE,
  );

  return (
    <>
      <SummaryCards
        items={[
          ["Orders", report.summary.orderCount],
          ["Active orders", report.summary.activeOrderCount],
          ["Recorded order value", money(report.summary.recordedOrderValueInr)],
          ["Quotations", report.summary.quotationCount],
          [
            "Accepted or converted quotations",
            report.summary.acceptedQuotationCount,
          ],
        ]}
      />
      <div
        className="report-record-tabs"
        role="tablist"
        aria-label="Sales report records"
      >
        <button
          type="button"
          role="tab"
          aria-selected={section === "orders"}
          className={section === "orders" ? "active" : ""}
          onClick={() => {
            setSection("orders");
            setPage(1);
          }}
        >
          Orders <span>{report.orders.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "quotations"}
          className={section === "quotations" ? "active" : ""}
          onClick={() => {
            setSection("quotations");
            setPage(1);
          }}
        >
          Quotations <span>{report.quotations.length}</span>
        </button>
      </div>
      <section className="report-section">
        <div className="report-section-heading">
          <div>
            <h3>{section === "orders" ? "Orders" : "Quotations"}</h3>
            <p>
              {section === "orders"
                ? "Orders recorded in the selected period."
                : "Quotation revisions issued in the selected period."}
            </p>
          </div>
          <span className="report-record-count">
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            {section === "orders" ? (
              <>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Recorded value</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleRows as SalesReport["orders"]).map((row) => (
                    <tr key={row.orderNumber}>
                      <td>
                        <span className="report-order-number">
                          {row.orderNumber}
                        </span>
                      </td>
                      <td>{timestamp(row.createdAt)}</td>
                      <td>
                        <span
                          className="report-status-pill"
                          data-status={row.status}
                        >
                          {formatEnumLabel(row.status)}
                        </span>
                      </td>
                      <td>{row.itemCount}</td>
                      <td>{money(row.recordedValueInr)}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={5} className="report-table-empty">
                        No orders in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Recorded value</th>
                    <th>Valid until</th>
                  </tr>
                </thead>
                <tbody>
                  {(visibleRows as SalesReport["quotations"]).map((row) => (
                    <tr key={`${row.quoteNumber}-${row.revisionNumber}`}>
                      <td>
                        <span className="report-order-number">
                          {row.quoteNumber} · Rev {row.revisionNumber}
                        </span>
                      </td>
                      <td>{timestamp(row.createdAt)}</td>
                      <td>
                        <span
                          className="report-status-pill"
                          data-status={row.status}
                        >
                          {formatEnumLabel(row.status)}
                        </span>
                      </td>
                      <td>{row.itemCount}</td>
                      <td>{money(row.recordedValueInr)}</td>
                      <td>{timestamp(row.validUntil)}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={6} className="report-table-empty">
                        No quotations in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </section>
      <ReportPagination
        page={page}
        total={rows.length}
        onPageChange={setPage}
      />
      <p className="report-range-note">
        {report.note} Quotation values include revisions and are grouped by
        their current status.
      </p>
    </>
  );
}

function ProcurementReportView({ report }: { report: ProcurementReport }) {
  const [section, setSection] = useState<"requests" | "purchaseOrders">(
    "requests",
  );
  const [requestsPage, setRequestsPage] = useState(1);
  const [purchaseOrdersPage, setPurchaseOrdersPage] = useState(1);
  const visibleRequests = report.requests.slice(
    (requestsPage - 1) * REPORT_PAGE_SIZE,
    requestsPage * REPORT_PAGE_SIZE,
  );
  const visiblePurchaseOrders = report.purchaseOrders.slice(
    (purchaseOrdersPage - 1) * REPORT_PAGE_SIZE,
    purchaseOrdersPage * REPORT_PAGE_SIZE,
  );

  return (
    <>
      <SummaryCards
        items={[
          ["Procurement requests", report.summary.requestCount],
          ["Purchase orders", report.summary.purchaseOrderCount],
          [
            "Planned purchase value",
            money(report.summary.plannedPurchaseValueInr),
          ],
        ]}
      />
      <div
        className="report-record-tabs"
        role="tablist"
        aria-label="Procurement report records"
      >
        <button
          type="button"
          role="tab"
          aria-selected={section === "requests"}
          className={section === "requests" ? "active" : ""}
          onClick={() => setSection("requests")}
        >
          Procurement requests <span>{report.requests.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === "purchaseOrders"}
          className={section === "purchaseOrders" ? "active" : ""}
          onClick={() => setSection("purchaseOrders")}
        >
          Purchase orders <span>{report.purchaseOrders.length}</span>
        </button>
      </div>
      {section === "requests" && (
        <>
          <section className="report-section">
            <div className="report-section-heading">
              <div>
                <h3>Procurement requests</h3>
                <p>
                  Customer and internal requests submitted during this period.
                </p>
              </div>
              <span className="report-record-count">
                {report.requests.length}{" "}
                {report.requests.length === 1 ? "record" : "records"}
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Supplier quotes</th>
                    <th>Purchase orders</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((row) => (
                    <tr key={row.requestNumber}>
                      <td>
                        <span className="report-order-number">
                          {row.requestNumber}
                        </span>
                      </td>
                      <td>{timestamp(row.createdAt)}</td>
                      <td>
                        <span
                          className="report-status-pill"
                          data-status={row.status}
                        >
                          {formatEnumLabel(row.status)}
                        </span>
                      </td>
                      <td>{row.itemCount}</td>
                      <td>{row.supplierQuoteCount}</td>
                      <td>{row.purchaseOrderCount}</td>
                    </tr>
                  ))}
                  {!report.requests.length && (
                    <tr>
                      <td colSpan={6}>
                        No procurement requests in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <ReportPagination
            page={requestsPage}
            total={report.requests.length}
            onPageChange={setRequestsPage}
          />
        </>
      )}
      {section === "purchaseOrders" && (
        <>
          <section className="report-section">
            <div className="report-section-heading">
              <div>
                <h3>Purchase orders</h3>
                <p>Supplier orders raised from procurement activity.</p>
              </div>
              <span className="report-record-count">
                {report.purchaseOrders.length}{" "}
                {report.purchaseOrders.length === 1 ? "record" : "records"}
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Purchase order</th>
                    <th>Request</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Planned value</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePurchaseOrders.map((row) => (
                    <tr key={row.purchaseOrderNumber}>
                      <td>
                        <span className="report-order-number">
                          {row.purchaseOrderNumber}
                        </span>
                      </td>
                      <td>
                        <span className="report-order-number">
                          {row.requestNumber}
                        </span>
                      </td>
                      <td>{row.supplierName}</td>
                      <td>{timestamp(row.createdAt)}</td>
                      <td>
                        <span
                          className="report-status-pill"
                          data-status={row.status}
                        >
                          {formatEnumLabel(row.status)}
                        </span>
                      </td>
                      <td>{money(row.plannedValueInr)}</td>
                    </tr>
                  ))}
                  {!report.purchaseOrders.length && (
                    <tr>
                      <td colSpan={6}>No purchase orders in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <ReportPagination
            page={purchaseOrdersPage}
            total={report.purchaseOrders.length}
            onPageChange={setPurchaseOrdersPage}
          />
        </>
      )}
    </>
  );
}

function FulfillmentReportView({ report }: { report: FulfillmentReport }) {
  const [page, setPage] = useState(1);
  const visibleDeliveries = report.deliveries.slice(
    (page - 1) * REPORT_PAGE_SIZE,
    page * REPORT_PAGE_SIZE,
  );
  return (
    <>
      <SummaryCards
        items={[
          ["Orders created", report.summary.orderCount],
          ["Delivery plans", report.summary.deliveryPlanCount],
          ["Delivered orders", report.summary.deliveredOrderCount],
        ]}
      />
      <section className="report-section">
        <div className="report-section-heading">
          <div>
            <h3>Delivery plans</h3>
            <p>Dispatch and delivery progress for orders in this period.</p>
          </div>
          <span className="report-record-count">
            {report.deliveries.length}{" "}
            {report.deliveries.length === 1 ? "record" : "records"}
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Order status</th>
                <th>Plan status</th>
                <th>Dispatch</th>
                <th>Estimated arrival</th>
                <th>Recorded deliveries</th>
                <th>Current location</th>
              </tr>
            </thead>
            <tbody>
              {visibleDeliveries.map((row) => (
                <tr key={row.orderNumber}>
                  <td>
                    <span className="report-order-number">
                      {row.orderNumber}
                    </span>
                  </td>
                  <td>
                    <span
                      className="report-status-pill"
                      data-status={row.orderStatus}
                    >
                      {formatEnumLabel(row.orderStatus)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="report-status-pill"
                      data-status={row.planStatus}
                    >
                      {formatEnumLabel(row.planStatus)}
                    </span>
                  </td>
                  <td>{timestamp(row.dispatchAt)}</td>
                  <td>{timestamp(row.estimatedArrival)}</td>
                  <td>{row.recordedDeliveryCount}</td>
                  <td>{row.currentLocation || "—"}</td>
                </tr>
              ))}
              {!report.deliveries.length && (
                <tr>
                  <td colSpan={7}>No delivery plans in this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <ReportPagination
        page={page}
        total={report.deliveries.length}
        onPageChange={setPage}
      />
      <div className="report-status-groups">
        <section className="report-status-card">
          <h3>Orders by status</h3>
          <div className="report-status-list">
            {report.ordersByStatus.map((row) => (
              <div className="report-status-row" key={row.status}>
                <span className="report-status-pill" data-status={row.status}>
                  {formatEnumLabel(row.status)}
                </span>
                <strong>{row.count}</strong>
              </div>
            ))}
            {!report.ordersByStatus.length && (
              <p className="report-empty-status">
                No order statuses in this period.
              </p>
            )}
          </div>
        </section>
        <section className="report-status-card">
          <h3>Delivery plans by status</h3>
          <div className="report-status-list">
            {report.plansByStatus.map((row) => (
              <div className="report-status-row" key={row.status}>
                <span className="report-status-pill" data-status={row.status}>
                  {formatEnumLabel(row.status)}
                </span>
                <strong>{row.count}</strong>
              </div>
            ))}
            {!report.plansByStatus.length && (
              <p className="report-empty-status">
                No delivery plan statuses in this period.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
