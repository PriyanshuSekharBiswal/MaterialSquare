import React, { useState } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import StaffLogin from "../features/auth/StaffLogin";

type Props = {
  children: React.ReactNode;
  marketplaceUrl?: string;
};

/**
 * Route protection middleware component for Staff and Admin Workspace.
 */
export function AdminProtectedRoute({
  children,
  marketplaceUrl = "",
}: Props) {
  const { isAuthenticated, loading, error, login } = useAdminAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="admin-auth-loading" role="status" aria-label="Authenticating staff session">
        Verifying staff session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <StaffLogin
        busy={busy}
        error={error}
        marketplaceUrl={marketplaceUrl}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          void login(new FormData(form))
            .catch(() => undefined)
            .finally(() => setBusy(false));
        }}
      />
    );
  }

  return <>{children}</>;
}
