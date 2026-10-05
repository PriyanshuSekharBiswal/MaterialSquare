import { useState, type FormEvent } from "react";

export type CommissionRecord = {
  id: string;
  beneficiaryName: string;
  amount: number | string;
  ratePct: number | string;
  basisAmount: number | string;
  status: string;
};

type CommissionInput = {
  beneficiaryName: string;
  beneficiaryPhone?: string;
  basisAmount: number;
  ratePct: number;
  notes?: string;
};

export default function CommissionManagement({
  records,
  busy,
  onCreate,
  onApprove,
}: {
  records: CommissionRecord[];
  busy: boolean;
  onCreate: (commission: CommissionInput) => Promise<boolean>;
  onApprove: (id: string) => Promise<boolean>;
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
      if (saved) form.reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="bc-form" onSubmit={(event) => void create(event)}>
        <h2>Record a commission</h2>
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
        <button className="bc-primary" disabled={busy || saving}>
          Submit for review
        </button>
      </form>
      <h2>Commission records</h2>
      {records.map((record) => (
        <article className="business-record" key={record.id}>
          <div>
            <strong>
              {record.beneficiaryName} · ₹
              {Number(record.amount).toLocaleString("en-IN")}
            </strong>
            <p>
              {record.ratePct}% of ₹
              {Number(record.basisAmount).toLocaleString("en-IN")}
            </p>
            <small>{record.status}</small>
          </div>
          {record.status === "PENDING_REVIEW" && (
            <button
              className="bc-button"
              disabled={busy}
              onClick={() => void onApprove(record.id)}
            >
              Approve
            </button>
          )}
        </article>
      ))}
    </>
  );
}
