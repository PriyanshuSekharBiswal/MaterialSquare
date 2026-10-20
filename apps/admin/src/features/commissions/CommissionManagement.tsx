import { useState, type FormEvent } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { formatEnumLabel } from "../../utils/formatEnumLabel";

export type CommissionRecord = {
  id: string;
  beneficiaryName: string;
  beneficiaryPhone?: string | null;
  amount: number | string;
  ratePct: number | string;
  basisAmount: number | string;
  status: string;
  notes?: string | null;
  createdAt?: string;
  createdBy?: string | null;
};

type CommissionInput = {
  beneficiaryName: string;
  beneficiaryPhone?: string;
  basisAmount: number;
  ratePct: number;
  notes?: string;
};

type CommissionView = "record" | "records";

export default function CommissionManagement({
  records,
  busy,
  onCreate,
  onApprove,
  activeView,
  onViewChange,
  onOpenRecord,
  focusedRecord,
}: {
  records: CommissionRecord[];
  busy: boolean;
  onCreate: (commission: CommissionInput) => Promise<boolean>;
  onApprove: (id: string) => Promise<boolean>;
  activeView: CommissionView;
  onViewChange: (view: CommissionView) => void;
  onOpenRecord: (recordId: string) => void;
  focusedRecord?: CommissionRecord;
}) {
  const [saving, setSaving] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setSaving(true);
    try {
      const saved = await onCreate({
        beneficiaryName: String(values.get("name") || "").trim(),
        beneficiaryPhone: String(values.get("phone") || "").trim() || undefined,
        basisAmount: Number(values.get("basis")),
        ratePct: Number(values.get("rate")),
        notes: String(values.get("notes") || "").trim() || undefined,
      });
      if (saved) {
        form.reset();
        onViewChange("records");
      }
    } finally {
      setSaving(false);
    }
  }

  const isFocused = Boolean(focusedRecord);

  return (
    <>
      {!isFocused && activeView === "record" && (
        <form className="bc-form commission-record-form" onSubmit={(event) => void create(event)}>
          <div className="commission-form-heading">
            <button type="button" className="btn-sm btn-secondary admin-back-button" onClick={() => onViewChange("records")}>
              <ArrowLeft size={15} aria-hidden="true" /> Back to records
            </button>
            <h2>Record a commission</h2>
          </div>
          <div className="bc-fields">
            <label>
              Beneficiary name
              <input name="name" maxLength={160} required />
            </label>
            <label>
              Phone
              <input name="phone" inputMode="numeric" maxLength={20} />
            </label>
            <label>
              Basis amount (₹)
              <input name="basis" type="number" min="0" step="0.01" required />
            </label>
            <label>
              Rate (%)
              <input
                name="rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </label>
            <label className="bc-wide">
              Notes
              <input name="notes" maxLength={2000} />
            </label>
          </div>
          <p className="bc-helper">
            Commission rules are set per record until eligibility and approval
            policy are confirmed.
          </p>
          <div className="commission-form-actions">
            <button className="bc-primary" disabled={busy || saving}>
              Submit for review
            </button>
          </div>
        </form>
      )}

      {!isFocused && activeView === "records" && (
        <section className="commission-record-list">
          <header className="commission-record-list-heading">
            <div>
              <h2>Commission records</h2>
              <p>Review commission submissions and pending approvals.</p>
            </div>
            <button type="button" className="btn-sm btn-primary" onClick={() => onViewChange("record")}>
              <Plus size={15} aria-hidden="true" /> Record commission
            </button>
          </header>
          {!records.length && (
            <p className="bc-helper" role="status">No commission records yet.</p>
          )}
          {records.map((record) => (
            <article className="business-record commission-record-card" key={record.id}>
              <div className="commission-record-info">
                <div className="commission-record-title-row">
                  <strong>{record.beneficiaryName}</strong>
                  <span
                    className={`commission-record-status is-${record.status.toLowerCase().replace(/_/g, "-")}`}
                  >
                    {formatEnumLabel(record.status)}
                  </span>
                </div>
                <p>
                  ₹{Number(record.amount).toLocaleString("en-IN")} commission · {record.ratePct}% of ₹
                  {Number(record.basisAmount).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="commission-record-side">
                <div className="commission-record-actions">
                  <button
                    type="button"
                    className="bc-button"
                    onClick={() => onOpenRecord(record.id)}
                  >
                    View details
                  </button>
                  {record.status === "PENDING_REVIEW" && (
                    <button
                      type="button"
                      className="bc-button"
                      disabled={busy}
                      onClick={() => void onApprove(record.id)}
                    >
                      Approve
                    </button>
                  )}
                </div>
                <CommissionMetadata record={record} />
              </div>
            </article>
          ))}
        </section>
      )}

      {focusedRecord && (
        <article className="bc-form commission-focused-record">
          <div className="commission-focused-heading">
            <div className="commission-record-title-row">
              <h2>{focusedRecord.beneficiaryName}</h2>
              <span
                className={`commission-record-status is-${focusedRecord.status.toLowerCase().replace(/_/g, "-")}`}
              >
                {formatEnumLabel(focusedRecord.status)}
              </span>
            </div>
            {focusedRecord.status === "PENDING_REVIEW" && (
              <button
                type="button"
                className="bc-button"
                disabled={busy}
                onClick={() => void onApprove(focusedRecord.id)}
              >
                Approve commission
              </button>
            )}
          </div>
          <dl className="commission-detail-grid">
            <div>
              <dt>Commission amount</dt>
              <dd>₹{Number(focusedRecord.amount).toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt>Rate</dt>
              <dd>{focusedRecord.ratePct}%</dd>
            </div>
            <div>
              <dt>Basis amount</dt>
              <dd>₹{Number(focusedRecord.basisAmount).toLocaleString("en-IN")}</dd>
            </div>
            {focusedRecord.beneficiaryPhone && (
              <div>
                <dt>Phone</dt>
                <dd>{focusedRecord.beneficiaryPhone}</dd>
              </div>
            )}
          </dl>
          {focusedRecord.notes && (
            <p className="commission-detail-notes">{focusedRecord.notes}</p>
          )}
          <CommissionMetadata record={focusedRecord} />
        </article>
      )}
    </>
  );
}

function CommissionMetadata({ record }: { record: CommissionRecord }) {
  const createdAt = record.createdAt ? new Date(record.createdAt) : null;
  const hasCreatedAt = Boolean(createdAt && Number.isFinite(createdAt.getTime()));
  return (
    <div className="commission-record-meta">
      <span>
        Created by <strong>{record.createdBy || "Unknown"}</strong>
      </span>
      {hasCreatedAt && createdAt ? (
        <time dateTime={record.createdAt}>
          {createdAt.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Kolkata",
          })}
        </time>
      ) : (
        <span>Date and time unavailable</span>
      )}
    </div>
  );
}
