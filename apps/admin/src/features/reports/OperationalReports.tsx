import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, RefreshCw } from "lucide-react";
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
    <section className="panel-card operational-reports">
      <div className="operational-reports-header">
        <div>
          <h2>Operational reports</h2>
          <p>
            Review recorded business activity by date and export the visible
            rows.
          </p>
        </div>
        <button
          className="btn-sm btn-secondary"
          onClick={() => setRange({ ...range })}
          disabled={loading}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="report-tabs" role="tablist" aria-label="Report category">
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
      <form className="report-filters" onSubmit={applyRange}>
        <label>
          From
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
          To
          <input
            type="date"
            value={draftRange.to}
            onChange={(event) =>
              setDraftRange({ ...draftRange, to: event.target.value })
            }
            required
          />
        </label>
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
      </form>
      <p className="report-range-note">
        Dates use India Standard Time. Customer names, phone numbers, addresses,
        and contact details are excluded.
      </p>
      {loading && <p role="status">Loading report…</p>}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      {data?.truncated && (
        <p role="status" className="report-truncated">
          Showing up to {data.rowLimit} rows per section. Narrow the date range
          to export a smaller complete report.
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

function SalesReportView({ report }: { report: SalesReport }) {
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
      <h3>Orders</h3>
      <div className="table-scroll">
        <table>
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
            {report.orders.map((row) => (
              <tr key={row.orderNumber}>
                <td>{row.orderNumber}</td>
                <td>{timestamp(row.createdAt)}</td>
                <td>{row.status}</td>
                <td>{row.itemCount}</td>
                <td>{money(row.recordedValueInr)}</td>
              </tr>
            ))}
            {!report.orders.length && (
              <tr>
                <td colSpan={5}>No orders in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3>Quotations</h3>
      <div className="table-scroll">
        <table>
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
            {report.quotations.map((row) => (
              <tr key={`${row.quoteNumber}-${row.revisionNumber}`}>
                <td>
                  {row.quoteNumber} · Rev {row.revisionNumber}
                </td>
                <td>{timestamp(row.createdAt)}</td>
                <td>{row.status}</td>
                <td>{row.itemCount}</td>
                <td>{money(row.recordedValueInr)}</td>
                <td>{timestamp(row.validUntil)}</td>
              </tr>
            ))}
            {!report.quotations.length && (
              <tr>
                <td colSpan={6}>No quotations in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="report-range-note">
        {report.note} Quotation values include revisions and are grouped by
        their current status.
      </p>
    </>
  );
}

function ProcurementReportView({ report }: { report: ProcurementReport }) {
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
      <h3>Procurement requests</h3>
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
            {report.requests.map((row) => (
              <tr key={row.requestNumber}>
                <td>{row.requestNumber}</td>
                <td>{timestamp(row.createdAt)}</td>
                <td>{row.status}</td>
                <td>{row.itemCount}</td>
                <td>{row.supplierQuoteCount}</td>
                <td>{row.purchaseOrderCount}</td>
              </tr>
            ))}
            {!report.requests.length && (
              <tr>
                <td colSpan={6}>No procurement requests in this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h3>Purchase orders</h3>
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
            {report.purchaseOrders.map((row) => (
              <tr key={row.purchaseOrderNumber}>
                <td>{row.purchaseOrderNumber}</td>
                <td>{row.requestNumber}</td>
                <td>{row.supplierName}</td>
                <td>{timestamp(row.createdAt)}</td>
                <td>{row.status}</td>
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
    </>
  );
}

function FulfillmentReportView({ report }: { report: FulfillmentReport }) {
  return (
    <>
      <SummaryCards
        items={[
          ["Orders created", report.summary.orderCount],
          ["Delivery plans", report.summary.deliveryPlanCount],
          ["Delivered orders", report.summary.deliveredOrderCount],
        ]}
      />
      <h3>Delivery plans</h3>
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
            {report.deliveries.map((row) => (
              <tr key={row.orderNumber}>
                <td>{row.orderNumber}</td>
                <td>{row.orderStatus}</td>
                <td>{row.planStatus}</td>
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
      <div className="report-status-groups">
        <div>
          <h3>Orders by status</h3>
          {report.ordersByStatus.map((row) => (
            <p key={row.status}>
              {row.status}
              <strong>{row.count}</strong>
            </p>
          ))}
        </div>
        <div>
          <h3>Delivery plans by status</h3>
          {report.plansByStatus.map((row) => (
            <p key={row.status}>
              {row.status}
              <strong>{row.count}</strong>
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
