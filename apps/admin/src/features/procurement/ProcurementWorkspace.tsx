import { useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import ProcurementRequestCard, {
  type ProcurementRequest,
} from "./ProcurementRequestCard";
import PurchaseRequestForm from "./PurchaseRequestForm";
import CustomerRfqSourcing from "./CustomerRfqSourcing";
import type { FormSubmit, Mutate } from "../business/form-contracts";

type Filter = "all" | "matching" | "quotes" | "approval" | "ordered";
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

export default function ProcurementWorkspace({
  records,
  busy,
  request,
  mutate,
  submit,
  download,
  onPrepareCustomerQuote,
}: {
  records: ProcurementRequest[];
  busy: boolean;
  request: Request;
  mutate: Mutate;
  submit: FormSubmit;
  download: (path: string, filename: string) => Promise<void>;
  onPrepareCustomerQuote?: (rfqId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [manualRequestOpen, setManualRequestOpen] = useState(false);
  const queueRef = useRef<HTMLElement | null>(null);
  const counts = useMemo(
    () => ({
      matching: records.filter((record) => record.status === "OPEN").length,
      quotes: records.filter((record) => record.status === "COMPARING").length,
      approval: records.filter((record) => record.status === "APPROVAL_PENDING").length,
      ordered: records.filter((record) => ["APPROVED", "ORDERED", "RECEIVED"].includes(record.status)).length,
    }),
    [records],
  );
  const filteredRecords = useMemo(() => {
    switch (filter) {
      case "matching":
        return records.filter((record) => record.status === "OPEN");
      case "quotes":
        return records.filter((record) => record.status === "COMPARING");
      case "approval":
        return records.filter((record) => record.status === "APPROVAL_PENDING");
      case "ordered":
        return records.filter((record) => ["APPROVED", "ORDERED", "RECEIVED"].includes(record.status));
      default:
        return records;
    }
  }, [filter, records]);

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All requests", count: records.length },
    { id: "matching", label: "Needs supplier match", count: counts.matching },
    { id: "quotes", label: "Compare quotes", count: counts.quotes },
    { id: "approval", label: "Awaiting approval", count: counts.approval },
    { id: "ordered", label: "Orders issued", count: counts.ordered },
  ];

  return (
    <section className="procurement-workspace" aria-labelledby="procurement-workspace-title">
      <header className="procurement-workspace-header">
        <div>
          <span className="procurement-eyebrow">PURCHASING WORKFLOW</span>
          <h2 id="procurement-workspace-title">Procurement</h2>
          <p>Move confirmed customer orders from sourcing through supplier quotes and purchase orders.</p>
        </div>
        <button
          type="button"
          className="bc-primary procurement-manual-toggle"
          aria-expanded={manualRequestOpen}
          onClick={() => setManualRequestOpen((open) => !open)}
        >
          {manualRequestOpen ? "Close manual request" : "+ Create manual request"}
        </button>
      </header>

      <div className="kpi-grid procurement-summary" aria-label="Procurement request summary">
        {[
          { id: "matching" as const, label: "Needs supplier match", value: counts.matching, detail: "Open requests", action: "View open requests" },
          { id: "quotes" as const, label: "Quotes to compare", value: counts.quotes, detail: "Supplier responses recorded", action: "Compare supplier quotes" },
          { id: "approval" as const, label: "Awaiting approval", value: counts.approval, detail: "Purchase orders for review", action: "Review purchase orders" },
          { id: "ordered" as const, label: "Orders issued", value: counts.ordered, detail: "Approved or sent to suppliers", action: "View issued orders" },
        ].map((item) => (
          <button
            type="button"
            className="kpi-card kpi-card-action procurement-summary-card"
            key={item.id}
            onClick={() => {
              setFilter(item.id);
              queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <h2>{item.label}</h2>
            <p className="kpi-value">{item.value}</p>
            <span className="procurement-summary-detail">{item.detail}</span>
            <span className="kpi-card-link">{item.action}<ArrowRight size={14} aria-hidden="true" /></span>
          </button>
        ))}
      </div>

      {manualRequestOpen && (
        <div className="procurement-manual-request">
          <div className="procurement-subsection-heading">
            <div>
              <h3>Create a manual request</h3>
              <p>Use this for urgent sourcing that is not linked to an accepted customer quotation.</p>
            </div>
          </div>
          <PurchaseRequestForm
            busy={busy}
            submit={submit}
            request={request}
            onSaved={() => setManualRequestOpen(false)}
          />
        </div>
      )}

      <CustomerRfqSourcing request={request} onPrepareCustomerQuote={onPrepareCustomerQuote} />

      <section ref={queueRef} className="procurement-queue" aria-labelledby="procurement-queue-title">
        <div className="procurement-queue-heading">
          <div>
            <span className="procurement-eyebrow">ORDER QUEUE</span>
            <h3 id="procurement-queue-title">Purchase requests</h3>
            <p>Accepted quotations create linked requests automatically when customer stock does not cover the order.</p>
          </div>
          <span className="procurement-request-count">{records.length} {records.length === 1 ? "request" : "requests"}</span>
        </div>

        <div className="procurement-filters" role="group" aria-label="Filter purchase requests">
          {filters.map((item) => (
            <button
              type="button"
              aria-pressed={filter === item.id}
              className={`procurement-filter${filter === item.id ? " active" : ""}`}
              key={item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}<span>{item.count}</span>
            </button>
          ))}
        </div>

        {filteredRecords.length ? (
          <div className="procurement-request-list">
            {filteredRecords.map((record) => (
              <ProcurementRequestCard
                key={record.id}
                record={record}
                request={request}
                busy={busy}
                mutate={mutate}
                download={download}
              />
            ))}
          </div>
        ) : busy && !records.length ? (
          <div className="procurement-empty-state" role="status">
            <strong>Loading purchase requests…</strong>
          </div>
        ) : (
          <div className="procurement-empty-state">
            <strong>{records.length ? "No requests in this stage" : "No purchase requests yet"}</strong>
            <p>{records.length ? "Choose another stage to view requests." : "Requests from accepted customer quotations will appear here when materials need to be sourced."}</p>
            {!records.length && <button type="button" className="bc-button" onClick={() => setManualRequestOpen(true)}>Create a manual request</button>}
          </div>
        )}
      </section>
    </section>
  );
}
