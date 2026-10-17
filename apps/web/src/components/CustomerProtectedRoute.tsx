import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { RefreshCw } from "lucide-react";

type Props = {
  children: React.ReactNode;
  fallbackPath?: string;
};

/**
 * Route protection middleware component for customer account pages.
 */
export function CustomerProtectedRoute({
  children,
  fallbackPath = "/account",
}: Props) {
  const { isAuthenticated, checking } = useCustomerAuth();
  const location = useLocation();

  if (checking) {
    return (
      <div className="account-loading" role="status" aria-label="Authenticating session">
        <RefreshCw className="account-spin" /> Verifying account session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
