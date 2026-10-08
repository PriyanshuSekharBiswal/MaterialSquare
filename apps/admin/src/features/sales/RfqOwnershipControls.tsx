import { useEffect, useState, type FormEvent } from "react";

type Assignee = { id: string; name: string; role: string };

export default function RfqOwnershipControls({
  rfqId,
  ownerId,
  ownerName,
  staffNotes,
  assignees,
  busy,
  mutate,
}: {
  rfqId: string;
  ownerId?: string | null;
  ownerName?: string | null;
  staffNotes?: string | null;
  assignees: Assignee[];
  busy: boolean;
  mutate: (url: string, method: string, body: unknown) => Promise<unknown>;
}) {
  const [notes, setNotes] = useState(staffNotes || "");
  useEffect(() => setNotes(staffNotes || ""), [staffNotes, rfqId]);

  function saveNotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void mutate(`/rfqs/${rfqId}/status`, "PATCH", {
      staffNotes: notes.trim() || null,
    });
  }

  return (
    <section className="rfq-staff-controls" aria-label="Internal request management">
      <label>
        Assigned staff owner
        <select
          value={ownerId || ""}
          disabled={busy}
          onChange={(event) =>
            void mutate(`/rfqs/${rfqId}/status`, "PATCH", {
              assignedStaffId: event.target.value || null,
            })
          }
        >
          <option value="">Unassigned</option>
          {ownerId && !assignees.some((staff) => staff.id === ownerId) && (
            <option value={ownerId}>{ownerName || "Inactive staff member"}</option>
          )}
          {assignees.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name} · {staff.role.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <form onSubmit={saveNotes}>
        <label>
          Internal staff note <span>(not shown to the customer)</span>
          <textarea
            value={notes}
            maxLength={3000}
            rows={3}
            disabled={busy}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <button
          className="btn-sm btn-secondary"
          disabled={busy || notes.trim() === (staffNotes || "").trim()}
        >
          Save internal note
        </button>
      </form>
    </section>
  );
}
