import { useState, type FormEvent } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import type { AdminStaff } from "../../components/AdminWorkspaceLayout";

export default function StaffAccount({
  token,
  staff,
  onSaved,
  onTokenChanged,
  onSignOut,
}: {
  token: string;
  staff: AdminStaff;
  onSaved: (staff: AdminStaff) => void;
  onTokenChanged: (token: string) => void;
  onSignOut: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    if (!email && !phone) {
      setError("Keep an email address or mobile number for sign-in.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/auth/staff/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, email: email || null, phone: phone || null }),
          signal: AbortSignal.timeout(65000),
        },
      );
      const result = await response.json().catch(() => null);
      if (response.status === 401) onSignOut();
      if (!response.ok)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not save your account details.",
        );
      onSaved(result as AdminStaff);
      setNotice("Your account details have been saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your account details.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    setPasswordError("");
    setPasswordNotice("");
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("Choose a new password that is different from your current password.");
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/auth/staff/me/password`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
          signal: AbortSignal.timeout(65000),
        },
      );
      const result = await response.json().catch(() => null);
      if (response.status === 401 && result?.message !== "Current password is incorrect")
        onSignOut();
      if (!response.ok)
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Could not change your password.",
        );
      if (typeof result?.accessToken !== "string")
        throw new Error("Your password changed, but we could not refresh this session. Please sign in again.");
      onTokenChanged(result.accessToken);
      formElement.reset();
      setPasswordNotice("Your password has been changed. Other signed-in sessions have been signed out.");
    } catch (cause) {
      setPasswordError(cause instanceof Error ? cause.message : "Could not change your password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <section className="panel-card panel-body staff-account-panel">
      <header>
        <span className="staff-account-icon"><UserRound size={20} /></span>
        <div>
          <h2>My account</h2>
          <p>Keep your profile and sign-in contact details up to date.</p>
        </div>
      </header>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="saved-notice" role="status">{notice}</p>}
      <form onSubmit={save} className="staff-account-form">
        <label>
          Full name
          <input name="name" required minLength={2} maxLength={150} defaultValue={staff.name} />
        </label>
        <label>
          Email address
          <input name="email" type="email" maxLength={254} defaultValue={staff.email || ""} />
        </label>
        <label>
          Mobile number
          <input name="phone" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} defaultValue={staff.phone || ""} />
        </label>
        <p className="staff-account-hint">Keep at least one sign-in method. Your role and permissions are managed separately by an administrator.</p>
        <button className="btn-sm btn-primary staff-account-submit" disabled={busy}>
          <Save size={15} /> {busy ? "Saving…" : "Save account details"}
        </button>
      </form>
      <section className="staff-password-section" aria-labelledby="staff-password-title">
        <header>
          <span className="staff-account-icon"><KeyRound size={19} /></span>
          <div>
            <h3 id="staff-password-title">Change password</h3>
            <p>Confirm your current password before setting a new one.</p>
          </div>
        </header>
        {passwordError && <p className="admin-error" role="alert">{passwordError}</p>}
        {passwordNotice && <p className="saved-notice" role="status">{passwordNotice}</p>}
        <form onSubmit={changePassword} className="staff-password-form">
          <label>
            Current password
            <input name="currentPassword" type="password" autoComplete="current-password" required maxLength={256} />
          </label>
          <label>
            New password
            <input name="newPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={256} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,256}" />
          </label>
          <label>
            Confirm new password
            <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={6} maxLength={256} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{6,256}" />
          </label>
          <p className="staff-account-hint">Use at least 6 characters, including an uppercase letter, a number and a special character. Changing your password signs out your other active sessions.</p>
          <button className="btn-sm btn-primary staff-account-submit" disabled={passwordBusy}>
            <KeyRound size={15} /> {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </section>
  );
}
