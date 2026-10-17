import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import ProcurementRequestCard, {
  type ProcurementRequest,
} from "./ProcurementRequestCard";
import PurchaseRequestForm from "./PurchaseRequestForm";
import CustomerRfqSourcing from "./CustomerRfqSourcing";
import type { FormSubmit, Mutate } from "../business/form-contracts";

type Filter = "all" | "matching" | "quotes" | "approval" | "ordered";
type View = "rfqs" | "purchase-requests" | "manual-request";
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;

export default function ProcurementWorkspace({
  records,
  busy,
  request,
  mutate,
  submit,
  download,
}: {
  records: ProcurementRequest[];
  busy: boolean;
  request: Request;
  mutate: Mutate;
  submit: FormSubmit;
  download: (path: string, filename: string) => Promise<void>;
}) {
  const [view, setView] = useState<View>("rfqs");
  const [filter, setFilter] = useState<Filter>("all");
  const secondaryTasksRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const details = secondaryTasksRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);
  const counts = {
    matching: records.filter((record) => record.status === "OPEN").length,
    quotes: records.filter((record) => record.status === "COMPARING").length,
    approval: records.filter((record) => record.status === "APPROVAL_PENDING").length,
    ordered: records.filter((record) => ["APPROVED", "ORDERED", "RECEIVED"].includes(record.status)).length,
  };
  const filteredRecords = records.filter((record) => {
    switch (filter) {
      case "matching": return record.status === "OPEN";
      case "quotes": return record.status === "COMPARING";
      case "approval": return record.status === "APPROVAL_PENDING";
      case "ordered": return ["APPROVED", "ORDERED", "RECEIVED"].includes(record.status);
      default: return true;
    }
  });
  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All requests", count: records.length },
    { id: "matching", label: "Needs supplier match", count: counts.matching },
    { id: "quotes", label: "Compare quotes", count: counts.quotes },
    { id: "approval", label: "Awaiting approval", count: counts.approval },
    { id: "ordered", label: "Orders issued", count: counts.ordered },
  ];

  const secondaryView = view !== "rfqs";
  const pageTitle = view === "purchase-requests" ? "Purchase requests" : "Create manual request";
  return <section className="procurement-workspace" aria-labelledby="procurement-workspace-title">
    {secondaryView && <button type="button" className="procurement-back-link admin-back-button" onClick={() => setView("rfqs")}>
      <ArrowLeft size={15} aria-hidden="true" /> Back to customer requests
    </button>}

    {view === "rfqs" ? <>
      <header className="procurement-workspace-header">
        <div>
          <span className="procurement-eyebrow">PROCUREMENT WORKSPACE</span>
          <h2 id="procurement-workspace-title">Procurement</h2>
          <p>Match suppliers to the original customer request or any quotation prepared for that request.</p>
        </div>
        <details ref={secondaryTasksRef} className="procurement-secondary-tasks">
          <summary>Other procurement tasks</summary>
          <div>
            <button className="procurement-secondary-task-option" type="button" onClick={() => { setFilter("all"); setView("purchase-requests"); }}>
              Purchase requests <span>{records.length}</span>
            </button>
            <button className="procurement-secondary-task-option" type="button" onClick={() => setView("manual-request")}>
              Create manual request
            </button>
          </div>
        </details>
      </header>
      <CustomerRfqSourcing request={request} />
    </> : <>
      <header className="procurement-workspace-header">
        <div>
          <span className="procurement-eyebrow">PROCUREMENT WORKSPACE</span>
          <h2 id="procurement-workspace-title">{pageTitle}</h2>
          {view === "purchase-requests"
            ? <p>Accepted quotations create linked requests here when customer stock does not cover the order.</p>
            : <p>Use this form for urgent sourcing that is not linked to a customer quotation.</p>}
        </div>
      </header>
      {view === "manual-request" && (
        <div className="procurement-manual-request">
          <PurchaseRequestForm busy={busy} submit={submit} request={request} onSaved={() => setView("purchase-requests")} />
        </div>
      )}
      {view === "purchase-requests" && <section className="procurement-queue" aria-labelledby="procurement-queue-title">
        <div className="procurement-queue-heading">
          <div><span className="procurement-eyebrow">SUPPLIER SOURCING AFTER ACCEPTANCE</span><h3 id="procurement-queue-title">Supplier quotes and orders</h3></div>
          <span className="procurement-request-count">{records.length} {records.length === 1 ? "request" : "requests"}</span>
        </div>
        <div className="kpi-grid procurement-summary" aria-label="Purchase request summary">
          {[
            { id: "matching" as const, label: "Needs supplier match", value: counts.matching, detail: "Open requests" },
            { id: "quotes" as const, label: "Quotes to compare", value: counts.quotes, detail: "Supplier responses" },
            { id: "approval" as const, label: "Awaiting approval", value: counts.approval, detail: "Purchase orders" },
            { id: "ordered" as const, label: "Orders issued", value: counts.ordered, detail: "Approved or sent" },
          ].map((item) => <button type="button" className="kpi-card kpi-card-action procurement-summary-card" key={item.id} onClick={() => setFilter(item.id)}>
            <h2>{item.label}</h2><p className="kpi-value">{item.value}</p><span className="procurement-summary-detail">{item.detail}</span>
          </button>)}
        </div>
        <div className="procurement-filters" role="group" aria-label="Filter purchase requests">
          {filters.map((item) => <button type="button" aria-pressed={filter === item.id} className={`procurement-filter${filter === item.id ? " active" : ""}`} key={item.id} onClick={() => setFilter(item.id)}>
            {item.label}<span>{item.count}</span>
          </button>)}
        </div>
        {filteredRecords.length ? <div className="procurement-request-list">
          {filteredRecords.map((record) => <ProcurementRequestCard key={record.id} record={record} request={request} busy={busy} mutate={mutate} download={download} />)}
        </div> : busy && !records.length
          ? <div className="procurement-empty-state" role="status"><strong>Loading purchase requests…</strong></div>
          : <div className="procurement-empty-state"><strong>{records.length ? "No requests in this stage" : "No purchase requests yet"}</strong><p>{records.length ? "Choose another stage to view requests." : "Accepted quotations will appear here when materials need to be sourced."}</p></div>}
      </section>}
    </>}
  </section>;
}
