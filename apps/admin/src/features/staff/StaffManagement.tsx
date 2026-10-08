import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, UserPlus, ShieldCheck, Trash2 } from "lucide-react";
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
          <h1>Staff & roles</h1>
          <p>Manage team profiles, access, passwords and role permissions.</p>
        </div>
        <button
          className="btn-sm btn-secondary"
          disabled={busy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={16} className={busy ? "spin" : ""} />
          {busy ? "Loading…" : "Refresh"}
        </button>
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
      <section className="panel-card panel-body staff-create">
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
      </section>
      <section className="staff-role-grid" aria-label="Predefined staff roles">
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
      </section>
      <section className="panel-card panel-body">
        <h2>Staff accounts</h2>
        {!staff.length && !busy && <p>No staff accounts found.</p>}
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Sign-in</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((record) => (
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
                    {editingDetailsFor === record.id && (
                      <form
                        className="staff-inline-edit"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const saved = await updateStaff(record.id, {
                            name: String(form.get("name") || "").trim(),
                            email: String(form.get("email") || "").trim() || null,
                            phone: String(form.get("phone") || "").trim() || null,
                          });
                          if (saved) setEditingDetailsFor("");
                        }}
                      >
                        <input
                          name="name"
                          aria-label={`Name for ${record.name}`}
                          required
                          minLength={2}
                          maxLength={150}
                          defaultValue={record.name}
                        />
                        <input
                          name="email"
                          aria-label={`Email for ${record.name}`}
                          type="email"
                          maxLength={254}
                          defaultValue={record.email || ""}
                          placeholder="Email"
                        />
                        <input
                          name="phone"
                          aria-label={`Mobile number for ${record.name}`}
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          maxLength={10}
                          defaultValue={record.phone || ""}
                          placeholder="Mobile"
                        />
                        <small>Keep at least one sign-in method.</small>
                        <div>
                          <button className="btn-sm btn-primary" disabled={busy}>Save details</button>
                          <button
                            type="button"
                            className="btn-sm btn-secondary"
                            disabled={busy}
                            onClick={() => setEditingDetailsFor("")}
                          >Cancel</button>
                        </div>
                      </form>
                    )}
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
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      disabled={busy}
                      onClick={() =>
                        setEditingDetailsFor(
                          editingDetailsFor === record.id ? "" : record.id,
                        )
                      }
                    >
                      Edit account
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      disabled={busy || record.role === "SUPER_ADMIN"}
                      onClick={() =>
                        void updateStaff(record.id, {
                          isActive: !record.isActive,
                        })
                      }
                    >
                      {record.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-secondary"
                      disabled={busy || record.id === currentStaffId}
                      onClick={() =>
                        setResetFor(resetFor === record.id ? "" : record.id)
                      }
                    >
                      Reset password
                    </button>
                    {record.role !== "SUPER_ADMIN" && record.id !== currentStaffId && (
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        disabled={busy}
                        onClick={() => void deleteStaff(record)}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    )}
                    {resetFor === record.id && (
                      <form
                        className="staff-reset-form"
                        onSubmit={(event) =>
                          void resetPassword(event, record)
                        }
                      >
                        <input
                          aria-label={`New password for ${record.name}`}
                          name="password"
                          type="password"
                          minLength={6}
                          pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,256}"
                          maxLength={256}
                          required
                          placeholder="New password (6+ characters)"
                        />
                        <small>Include an uppercase letter, a number and a special character.</small>
                        <button className="btn-sm btn-primary" disabled={busy}>
                          Save
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
