import type { Dispatch, FormEvent, SetStateAction } from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import {
  blankFollowup,
  followupStatuses,
  type Customer,
  type Followup,
  type Material,
  type Page,
  type WorkspaceTab,
} from "./contracts";

type CustomerFollowupWorkspaceProps = {
  tab: "customers" | "followups";
  customers: Page<Customer>;
  followups: Page<Followup>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  setSearch: Dispatch<SetStateAction<string>>;
  status: string;
  setStatus: Dispatch<SetStateAction<string>>;
  setPage: Dispatch<SetStateAction<number>>;
  page: number;
  loading: boolean;
  busy: boolean;
  selected: Customer | null;
  setSelected: Dispatch<SetStateAction<Customer | null>>;
  openCustomer: (id: string) => void;
  draft: Followup | null;
  setDraft: Dispatch<SetStateAction<Followup | null>>;
  setTab: Dispatch<SetStateAction<WorkspaceTab>>;
  setError: Dispatch<SetStateAction<string>>;
  save: (event: FormEvent<HTMLFormElement>) => void;
};

export default function CustomerFollowupWorkspace({
  tab,
  customers,
  followups,
  query,
  setQuery,
  setSearch,
  status,
  setStatus,
  setPage,
  page,
  loading,
  busy,
  selected,
  setSelected,
  openCustomer,
  draft,
  setDraft,
  setTab,
  setError,
  save,
}: CustomerFollowupWorkspaceProps) {
  const result = tab === "customers" ? customers : followups;

  return (
    <>
      {!selected && !draft && (
        <>
          <form
            className="workspace-toolbar"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(query);
            }}
          >
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Search by name or mobile"
                placeholder="Search name or mobile number"
                value={query}
                maxLength={100}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button className="btn-sm btn-secondary">Search</button>
            {tab === "followups" && (
              <>
                <select
                  aria-label="Filter status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {Object.entries(followupStatuses).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-sm btn-primary"
                  onClick={() => setDraft(blankFollowup())}
                >
                  <Plus size={16} />
                  New follow-up
                </button>
              </>
            )}
          </form>
          <section className="panel-card panel-body">
            <p className="muted">
              {result.total}{" "}
              {tab === "customers" ? "customer records" : "follow-ups"}
            </p>
            {!loading && !result.items.length && (
              <p className="empty">
                {tab === "customers"
                  ? "Customer records appear here after a quotation or follow-up is recorded."
                  : "No follow-ups found. Record an enquiry when staff receive it."}
              </p>
            )}
            {tab === "customers"
              ? customers.items.map((c) => (
                  <article className="workspace-record" key={c.id}>
                    <div>
                      <h3>{c.name || "Unnamed contact"}</h3>
                      <p>
                        +91 {c.phone}
                        {c.companyName ? ` · ${c.companyName}` : ""}
                      </p>
                      <small>{c.city}</small>
                      <small>
                        Record created {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString("en-IN")
                          : "date unavailable"}
                      </small>
                    </div>
                    <button
                      className="btn-sm btn-secondary"
                      disabled={busy}
                      onClick={() => void openCustomer(c.id)}
                    >
                      View contact
                    </button>
                  </article>
                ))
              : followups.items.map((f) => (
                  <article className="workspace-record" key={f.id}>
                    <div>
                      <h3>
                        {f.customerName}{" "}
                        <span
                          className={`status-label status-${f.status.toLowerCase()}`}
                        >
                          {followupStatuses[f.status]}
                        </span>
                      </h3>
                      <p>
                        +91 {f.phone} · {f.source.toLowerCase()} ·{" "}
                        {f.city || "Location to confirm"}
                      </p>
                      <small>
                        {f.updatedAt
                          ? new Date(f.updatedAt).toLocaleString("en-IN")
                          : ""}
                      </small>
                    </div>
                    <button
                      className="btn-sm btn-secondary"
                      onClick={() => {
                        setDraft(f);
                        setError("");
                      }}
                    >
                      Open follow-up
                    </button>
                  </article>
                ))}
          </section>
          <div className="pagination">
            <button
              className="btn-sm btn-secondary"
              disabled={page === 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(result.total / 20))}
            </span>
            <button
              className="btn-sm btn-secondary"
              disabled={page * 20 >= result.total || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      {selected && !draft && (
        <section className="panel-card panel-body">
          <button
            className="btn-sm btn-secondary"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={16} />
            Back to customers
          </button>
          <h2>{selected.name || "Profile not completed"}</h2>
          <div className="customer-summary">
            <p>
              <strong>Mobile</strong>+91 {selected.phone}
            </p>
            <p>
              <strong>Email</strong>
              {selected.email || "Not provided"}
            </p>
            <p>
              <strong>Company</strong>
              {selected.companyName || "Not provided"}
            </p>
            <p>
              <strong>Site address</strong>
              {[selected.shippingAddress, selected.city, selected.pincode]
                .filter(Boolean)
                .join(", ") || "Not provided"}
            </p>
            <p>
              <strong>Record created</strong>
              {selected.createdAt
                ? new Date(selected.createdAt).toLocaleString("en-IN")
                : "Not available"}
            </p>
          </div>
          <div className="workspace-actions">
            <button
              className="btn-sm btn-primary"
              onClick={() => {
                setTab("followups");
                setPage(1);
                setSearch("");
                setQuery("");
                setStatus("");
                setDraft({
                  ...blankFollowup(),
                  customerName: selected.name,
                  phone: selected.phone,
                  email: selected.email || "",
                  siteAddress: selected.shippingAddress || "",
                  city: selected.city,
                  pincode: selected.pincode,
                  materials: [],
                });
              }}
            >
              Record follow-up
            </button>
            <a
              className="btn-sm btn-secondary"
              href={`https://wa.me/91${selected.phone}`}
              target="_blank"
              rel="noreferrer"
            >
              Open WhatsApp
            </a>
          </div>
        </section>
      )}
      {draft && (
        <form className="panel-card panel-body followup-form" onSubmit={save}>
          <div className="workspace-actions">
            <h2>{draft.id ? "Edit follow-up" : "Record an enquiry"}</h2>
            <button
              type="button"
              className="btn-sm btn-secondary"
              onClick={() => {
                setDraft(null);
                setSelected(null);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          <div className="field-grid">
            {(
              [
                ["customerName", "Customer name", "text"],
                ["phone", "Mobile number", "tel"],
                ["email", "Email", "email"],
                ["siteAddress", "Site / delivery address", "text"],
                ["city", "City", "text"],
                ["pincode", "PIN code", "text"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key}>
                {label}
                <input
                  value={draft[key]}
                  type={type}
                  required={key === "customerName" || key === "phone"}
                  minLength={key === "customerName" ? 2 : undefined}
                  maxLength={
                    key === "phone"
                      ? 10
                      : key === "pincode"
                        ? 6
                        : key === "siteAddress"
                          ? 500
                          : key === "email"
                            ? 254
                            : 100
                  }
                  pattern={
                    key === "phone"
                      ? "[6-9][0-9]{9}"
                      : key === "pincode"
                        ? "[1-9][0-9]{5}"
                        : undefined
                  }
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Received through
              <select
                value={draft.source}
                onChange={(e) => setDraft({ ...draft, source: e.target.value })}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Phone</option>
              </select>
            </label>
            <label>
              Status
              <select
                aria-label="Follow-up status"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              >
                {Object.entries(followupStatuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h3>Requested materials</h3>
          {draft.materials.map((m, i) => (
            <div className="material-row" key={i}>
              {(
                [
                  ["name", "Material"],
                  ["brand", "Brand"],
                  ["quantity", "Quantity"],
                  ["unit", "Unit"],
                  ["specification", "Size / specification"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    aria-label={`${label} ${i + 1}`}
                    type={key === "quantity" ? "number" : "text"}
                    min={key === "quantity" ? "0.001" : undefined}
                    max={key === "quantity" ? "1000000" : undefined}
                    step="any"
                    required={["name", "unit", "quantity"].includes(key)}
                    maxLength={
                      key === "specification"
                        ? 500
                        : key === "name"
                          ? 300
                          : key === "unit"
                            ? 50
                            : 100
                    }
                    value={m[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        materials: draft.materials.map((row, n) =>
                          n === i
                            ? {
                                ...row,
                                [key]:
                                  key === "quantity"
                                    ? Number(e.target.value)
                                    : e.target.value,
                              }
                            : row,
                        ),
                      })
                    }
                  />
                </label>
              ))}
              <button
                type="button"
                className="btn-sm btn-secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    materials: draft.materials.filter((_, n) => n !== i),
                  })
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-sm btn-secondary"
            disabled={draft.materials.length >= 100}
            onClick={() =>
              setDraft({
                ...draft,
                materials: [
                  ...draft.materials,
                  {
                    name: "",
                    brand: "",
                    quantity: 1,
                    unit: "Pieces",
                    specification: "",
                  },
                ],
              })
            }
          >
            Add material
          </button>
          <label>
            Staff notes
            <textarea
              maxLength={5000}
              rows={4}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
          <button className="btn-sm btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save follow-up"}
          </button>
        </form>
      )}
    </>
  );
}
