import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  RefreshCw,
  UserPlus,
  ShieldCheck,
  Trash2,
  Search,
} from "lucide-react";
import { confirmAdminAction } from "../../components/confirmAdminAction";
import "./staff-management.css";

type Role = {
  role: string;
  label: string;
  description: string;
  permissions: string[];
};
type StaffRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};
const permissionLabels: Record<string, string> = {
  "staff.profile": "View own staff profile",
  "staff.manage": "Manage staff accounts, access and roles",
  "dashboard.view": "View dashboard and analytics",
  "customers.read": "View customer contact records",
  "followups.manage": "Manage customer follow-ups",
  "sales.manage": "Manage sales requests and quotations",
  "orders.read": "View orders",
  "media.manage": "Upload approved website images",
  "dispatch.view": "View delivery plans",
  "dispatch.manage": "Manage dispatch and delivery plans",
  "catalog.view": "View the product catalogue",
  "catalog.manage": "Manage product pricing and discounts",
  "procurement.view": "View suppliers and procurement",
  "procurement.manage": "Manage suppliers and purchase orders",
  "content.manage": "Manage website content",
  "finance.manage": "Manage commissions and loyalty accounts",
  "reports.sales.read": "View sales and quotation reports",
  "reports.procurement.read": "View procurement reports",
  "reports.dispatch.read": "View delivery and fulfillment reports",
};

export default function StaffManagement({
  token,
  onBack,
  onSignOut,
  embedded = false,
  currentStaffId,
}: {
  token: string;
  onBack: () => void;
  onSignOut: () => void;
  embedded?: boolean;
  currentStaffId?: string;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resetFor, setResetFor] = useState("");
  const [editingDetailsFor, setEditingDetailsFor] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState(
    () => new URLSearchParams(window.location.search).get("staffId") || "",
  );
  const [isStaffAccountsPage, setIsStaffAccountsPage] = useState(
    () => new URLSearchParams(window.location.search).get("staffView") === "accounts",
  );
  const [staffSearch, setStaffSearch] = useState("");
  const [staffSearchFocused, setStaffSearchFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}${path}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(65000),
        },
      );
      const data = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok)
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Could not complete this action.",
        );
      return data as T;
    },
    [token, onSignOut],
  );

  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [roleRows, staffRows] = await Promise.all([
        request<Role[]>("/admin/staff/roles"),
        request<StaffRecord[]>("/admin/staff"),
      ]);
      setRoles(roleRows);
      setStaff(staffRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load staff access.");
    } finally {
      setBusy(false);
    }
  }, [request]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const syncSelectedStaff = () => {
      setSelectedStaffId(new URLSearchParams(window.location.search).get("staffId") || "");
      setIsStaffAccountsPage(new URLSearchParams(window.location.search).get("staffView") === "accounts");
    };
    window.addEventListener("popstate", syncSelectedStaff);
    return () => window.removeEventListener("popstate", syncSelectedStaff);
  }, []);
  const selectedStaff = staff.find((record) => record.id === selectedStaffId) || null;
  const matchingStaff = staff.filter((record) => {
    const roleLabel = roles.find((role) => role.role === record.role)?.label || record.role;
    const searchable = [record.name, record.phone, record.email, record.role, roleLabel]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return searchable.includes(staffSearch.trim().toLocaleLowerCase());
  });
  const staffSuggestions = staffSearch.trim() ? matchingStaff.slice(0, 6) : [];

  function openStaffAccount(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("staffView", "accounts");
    url.searchParams.set("staffId", id);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedStaffId(id);
    setIsStaffAccountsPage(true);
    setEditingDetailsFor("");
    setResetFor("");
    setStaffSearchFocused(false);
  }

  function backToStaffList() {
    const url = new URL(window.location.href);
    url.searchParams.delete("staffId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedStaffId("");
    setIsStaffAccountsPage(true);
    setEditingDetailsFor("");
    setResetFor("");
  }

  function openStaffAccounts() {
    const url = new URL(window.location.href);
    url.searchParams.set("staffView", "accounts");
    url.searchParams.delete("staffId");
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setIsStaffAccountsPage(true);
    setSelectedStaffId("");
  }

  function backToStaffRoles() {
    const url = new URL(window.location.href);
    url.searchParams.delete("staffView");
    url.searchParams.delete("staffId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setIsStaffAccountsPage(false);
    setSelectedStaffId("");
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const phone = String(values.get("phone") || "").trim();
    const email = String(values.get("email") || "").trim();
    if (!phone && !email) {
      setError("Enter either a mobile number or an email address for sign-in.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request("/admin/staff", "POST", {
        name: values.get("name"),
        email: email || undefined,
        phone: phone || undefined,
        role: values.get("role"),
        password: values.get("password"),
      });
      form.reset();
      setNotice(
        "Staff account created. Share the login details with that staff member securely.",
      );
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the staff account.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateStaff(
    id: string,
    data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      role?: string;
      isActive?: boolean;
    },
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/admin/staff/${id}`, "PATCH", data);
      setNotice(
        data.name !== undefined || data.email !== undefined || data.phone !== undefined
          ? "Staff account details saved."
          : "Staff access updated.",
      );
      await refresh();
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update staff access.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function deleteStaff(record: StaffRecord) {
    if (!(await confirmAdminAction({
      title: "Move this staff account to Recently deleted?",
      message: `${record.name} will lose access immediately. An admin can restore the account for 30 days.`,
      confirmLabel: "Move to recently deleted",
      tone: "danger",
    }))) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/admin/staff/${record.id}`, "DELETE");
      backToStaffList();
      setNotice(`${record.name} was moved to Recently deleted.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the staff account.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, record: StaffRecord) {
    event.preventDefault();
    // Capture the form before awaiting the confirmation dialog; React clears
    // the submit event's currentTarget after the handler yields.
    const form = event.currentTarget;
    if (!(await confirmAdminAction({
      title: `Reset ${record.name}’s password?`,
      message: "Their existing password will stop working, and their other active sessions will be signed out.",
      confirmLabel: "Reset password",
      tone: "danger",
    }))) return;
    const password = new FormData(form).get("password");
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await request(`/admin/staff/${record.id}/password`, "POST", { password });
      form.reset();
      setResetFor("");
      setNotice(
        "Password reset. Share the new password with the staff member securely.",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not reset the password.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="embedded-staff-view" style={{ width: "100%" }}>
      <header
        className="staff-management-header"
        style={{ marginBottom: "20px" }}
      >
        <div>
          {!embedded && (
            <button
              className="btn-sm btn-secondary"
              onClick={onBack}
              style={{ marginBottom: "8px" }}
            >
              ← Back to dashboard
            </button>
          )}
          <span className="eyebrow">TEAM ACCESS & SECURITY</span>
          <h1>{selectedStaff ? "Staff account" : isStaffAccountsPage ? "Staff accounts" : "Staff & roles"}</h1>
          <p>{selectedStaff ? "Manage this staff account and its access." : isStaffAccountsPage ? "View and manage staff access, account details and security." : "Manage team profiles, access, passwords and role permissions."}</p>
        </div>
        <div className="staff-management-header-actions">
          {(selectedStaff || isStaffAccountsPage) && <button className="btn-sm btn-secondary btn-orange-outline" onClick={selectedStaff ? backToStaffList : backToStaffRoles}><ArrowLeft size={16} /> {selectedStaff ? "Back to staff accounts" : "Back to Staff & roles"}</button>}
          <button className="btn-sm btn-secondary btn-orange-outline" disabled={busy} onClick={() => void refresh()}>
            <RefreshCw size={16} className={busy ? "spin" : ""} />
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>
      </header>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="saved-notice" role="status">
          {notice}
        </p>
      )}
      {!selectedStaff && !isStaffAccountsPage && <section className="panel-card panel-body staff-create">
        <h2>
          <UserPlus size={19} /> Add a staff member
        </h2>
        <p>
          Give each person their own account. They can sign in with the mobile
          number or email you enter and the password you set.
        </p>
        <form onSubmit={createStaff}>
          <label>
            Full name
            <input name="name" required minLength={2} maxLength={150} />
          </label>
          <label>
            Mobile number (optional)
            <input
              name="phone"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10-digit number"
            />
          </label>
          <label>
            Email address (optional)
            <input
              name="email"
              type="email"
              maxLength={254}
              placeholder="name@company.com"
            />
          </label>
          <label>
            Role
            <select name="role" required defaultValue="">
              <option value="" disabled>
                Choose a role
              </option>
              {roles.map((role) => (
                <option key={role.role} value={role.role}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="staff-password-field">
            Temporary password
            <input
              name="password"
              type="password"
              required
              minLength={6}
              pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,256}"
              maxLength={256}
              autoComplete="new-password"
            />
            <small>
              At least 6 characters, including an uppercase letter, a number and a special character. Share it privately.
            </small>
          </label>
          <button className="btn-sm btn-primary" disabled={busy}>
            Create staff account
          </button>
        </form>
      </section>}
      {!selectedStaff && !isStaffAccountsPage && <section className="staff-role-grid" aria-label="Predefined staff roles">
        {roles.map((role) => (
          <article className="panel-card staff-role-card" key={role.role}>
            <h3>
              <ShieldCheck size={17} />
              {role.label}
            </h3>
            <p>{role.description}</p>
            <small>
              Access:{" "}
              {role.permissions
                .map((permission) => permissionLabels[permission] || permission)
                .join(" · ")}
            </small>
          </article>
        ))}
      </section>}
      {selectedStaff ? <section className="panel-card panel-body staff-account-detail">
        <div className="staff-account-detail-heading">
          <div><span className="eyebrow">STAFF ACCOUNT</span><h2>{selectedStaff.name}</h2><p>Account details, access and security controls.</p></div>
          <span className={selectedStaff.isActive ? "staff-active" : "staff-inactive"}>{selectedStaff.isActive ? "Active" : "Disabled"}</span>
        </div>
        <dl className="staff-account-detail-grid">
          <div><dt>Sign-in</dt><dd>{selectedStaff.phone || selectedStaff.email || "Not provided"}</dd></div>
          {selectedStaff.phone && selectedStaff.email && <div><dt>Email address</dt><dd>{selectedStaff.email}</dd></div>}
          <div><dt>Role</dt><dd>{selectedStaff.role === "SUPER_ADMIN" ? "Owner / Main client" : roles.find((role) => role.role === selectedStaff.role)?.label || selectedStaff.role}</dd></div>
          <div><dt>Added</dt><dd>{new Date(selectedStaff.createdAt).toLocaleDateString("en-IN")}</dd></div>
        </dl>
        <div className="staff-account-detail-actions">
          <button type="button" className="btn-sm btn-secondary btn-orange-outline" disabled={busy} onClick={() => setEditingDetailsFor(editingDetailsFor === selectedStaff.id ? "" : selectedStaff.id)}>{editingDetailsFor === selectedStaff.id ? "Cancel edit" : "Edit account"}</button>
          <button type="button" className="btn-sm btn-secondary btn-orange-outline" disabled={busy || selectedStaff.role === "SUPER_ADMIN"} onClick={() => void updateStaff(selectedStaff.id, { isActive: !selectedStaff.isActive })}>{selectedStaff.isActive ? "Disable account" : "Enable account"}</button>
          <button type="button" className="btn-sm btn-secondary btn-orange-outline" disabled={busy || selectedStaff.id === currentStaffId} onClick={() => setResetFor(resetFor === selectedStaff.id ? "" : selectedStaff.id)}>{resetFor === selectedStaff.id ? "Cancel password reset" : "Reset password"}</button>
          {selectedStaff.role !== "SUPER_ADMIN" && selectedStaff.id !== currentStaffId && <button type="button" className="btn-sm btn-secondary staff-delete-action" disabled={busy} onClick={() => void deleteStaff(selectedStaff)}><Trash2 size={15} /> Delete account</button>}
        </div>
        {editingDetailsFor === selectedStaff.id && <form className="staff-detail-form" onSubmit={async (event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const saved = await updateStaff(selectedStaff.id, { name: String(form.get("name") || "").trim(), email: String(form.get("email") || "").trim() || null, phone: String(form.get("phone") || "").trim() || null }); if (saved) setEditingDetailsFor(""); }}>
          <label>Full name<input name="name" required minLength={2} maxLength={150} defaultValue={selectedStaff.name} /></label>
          <label>Email address<input name="email" type="email" maxLength={254} defaultValue={selectedStaff.email || ""} placeholder="Email" /></label>
          <label>Mobile number<input name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} defaultValue={selectedStaff.phone || ""} placeholder="Mobile" /></label>
          <div className="staff-detail-form-actions"><small>Keep at least one sign-in method.</small><button className="btn-sm btn-primary" disabled={busy}>Save details</button></div>
        </form>}
        {resetFor === selectedStaff.id && <form className="staff-detail-form staff-detail-reset-form" onSubmit={(event) => void resetPassword(event, selectedStaff)}>
          <label>New temporary password<input name="password" type="password" minLength={6} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,256}" maxLength={256} required placeholder="At least 6 characters" /></label>
          <div className="staff-detail-form-actions"><small>Include an uppercase letter, a number and a special character.</small><button className="btn-sm btn-primary" disabled={busy}>Reset password</button></div>
        </form>}
      </section> : isStaffAccountsPage ? <section className="panel-card panel-body">
        <h2>Staff accounts</h2>
        <div className="staff-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setStaffSearchFocused(false); }}>
          <label className="staff-search-field">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={staffSearch}
              placeholder="Search by name, mobile number, email or role"
              aria-label="Search staff accounts by name, mobile number, email or role"
              aria-autocomplete="list"
              aria-expanded={staffSearchFocused && staffSuggestions.length > 0}
              aria-controls="staff-search-suggestions"
              aria-activedescendant={activeSuggestion >= 0 ? `staff-suggestion-${staffSuggestions[activeSuggestion]?.id}` : undefined}
              onFocus={() => setStaffSearchFocused(true)}
              onChange={(event) => { setStaffSearch(event.target.value); setActiveSuggestion(-1); setStaffSearchFocused(true); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && staffSuggestions.length) {
                  event.preventDefault();
                  setActiveSuggestion((current) => (current + 1) % staffSuggestions.length);
                } else if (event.key === "ArrowUp" && staffSuggestions.length) {
                  event.preventDefault();
                  setActiveSuggestion((current) => current <= 0 ? staffSuggestions.length - 1 : current - 1);
                } else if (event.key === "Enter" && activeSuggestion >= 0 && staffSuggestions[activeSuggestion]) {
                  event.preventDefault();
                  openStaffAccount(staffSuggestions[activeSuggestion].id);
                } else if (event.key === "Escape") {
                  setStaffSearchFocused(false);
                  setActiveSuggestion(-1);
                }
              }}
            />
          </label>
          {staffSearchFocused && staffSuggestions.length > 0 && <ul className="staff-search-suggestions" id="staff-search-suggestions" role="listbox" aria-label="Matching staff accounts">
            {staffSuggestions.map((record, index) => (
              <li key={record.id}>
                <button
                  type="button"
                  id={`staff-suggestion-${record.id}`}
                  role="option"
                  aria-selected={index === activeSuggestion}
                  className={index === activeSuggestion ? "is-active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveSuggestion(index)}
                  onClick={() => openStaffAccount(record.id)}
                >
                  <span><strong>{record.name}</strong><small>{record.phone || record.email || "No sign-in details"}</small></span>
                  <span className="staff-suggestion-role">{roles.find((role) => role.role === record.role)?.label || record.role}</span>
                </button>
              </li>
            ))}
          </ul>}
        </div>
        <p className="staff-search-count">Showing {matchingStaff.length} of {staff.length} staff accounts</p>
        {!staff.length && !busy && <p>No staff accounts found.</p>}
        {!!staff.length && !matchingStaff.length && <p className="staff-search-empty">No staff accounts match “{staffSearch}”.</p>}
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Sign-in</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {matchingStaff.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.name}</strong>
                    <small>
                      Added{" "}
                      {new Date(record.createdAt).toLocaleDateString("en-IN")}
                    </small>
                  </td>
                  <td>
                    {record.phone || record.email}
                    <small>
                      {record.phone && record.email ? record.email : ""}
                    </small>
                  </td>
                  <td>
                    {record.role === "SUPER_ADMIN" ? (
                      <span className="staff-owner-role">
                        Owner / Main client
                      </span>
                    ) : (
                      <select
                        aria-label={`Role for ${record.name}`}
                        value={record.role}
                        disabled={busy}
                        onChange={(event) =>
                          void updateStaff(record.id, {
                            role: event.target.value,
                          })
                        }
                      >
                        {roles.map((role) => (
                          <option key={role.role} value={role.role}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        record.isActive ? "staff-active" : "staff-inactive"
                      }
                    >
                      {record.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="staff-actions">
                    <button type="button" className="btn-sm btn-secondary btn-orange-outline staff-see-more" disabled={busy} onClick={() => openStaffAccount(record.id)}>
                      <MoreHorizontal size={16} /> See more <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section> : <section className="panel-card panel-body staff-accounts-entry">
        <div>
          <span className="eyebrow">TEAM DIRECTORY</span>
          <h2>Staff accounts</h2>
          <p>Review team members, update roles and manage account access.</p>
        </div>
        <button type="button" className="btn-sm btn-primary" onClick={openStaffAccounts}>
          View staff accounts <ArrowRight size={16} />
        </button>
      </section>}
    </div>
  );
}
