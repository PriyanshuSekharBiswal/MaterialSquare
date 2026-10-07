import type { FormEvent } from "react";
import MaterialSquareLogo from "../../components/MaterialSquareLogo";

type StaffLoginProps = {
  busy: boolean;
  error: string;
  marketplaceUrl: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function StaffLogin({
  busy,
  error,
  marketplaceUrl,
  onSubmit,
}: StaffLoginProps) {
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-logo-container">
          <MaterialSquareLogo
            size={50}
            showText={true}
            lightMode={false}
            tagline="BUILDING BETTER TOGETHER"
          />
          <span className="login-badge-sub">CLIENT ADMIN WORKSPACE</span>
        </div>
        <label>
          Mobile number or email
          <input
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="e.g. 9876543210 or staff@materialsquare.com"
            maxLength={254}
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your security password"
            minLength={8}
            required
          />
        </label>
        <p className="login-session-note">
          Stay signed in on this browser when you close or refresh it. Sign out
          from the workspace when you’re finished. For security, remembered
          sessions expire after 30 days.
        </p>
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <button
          className="btn-sm btn-primary"
          style={{
            padding: "12px 18px",
            fontSize: "0.92rem",
            borderRadius: "10px",
            marginTop: "4px",
          }}
          disabled={busy}
        >
          {busy ? "Authenticating…" : "Sign In to Workspace"}
        </button>
        {marketplaceUrl && (
          <a
            href={marketplaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="login-back-link"
          >
            ← Return to Material Square Marketplace
          </a>
        )}
      </form>
    </main>
  );
}
