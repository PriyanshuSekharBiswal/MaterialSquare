import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiError, customerApi } from "../api";
import type { Profile } from "../features/customer-account/model";

export type CustomerAuthContextType = {
  profile: Profile | null;
  isAuthenticated: boolean;
  checking: boolean;
  error: string;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
};

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const me = await customerApi<Profile>(
        "/customer/me",
        "GET",
        undefined,
        undefined,
        12000,
      );
      setProfile(me);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setProfile(null);
      } else {
        setError((e as Error).message);
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await customerApi("/customer/logout", "POST", {}, profile?.id);
    } catch {
      // Ignore network errors on logout
    } finally {
      setProfile(null);
    }
  }, [profile?.id]);

  const value: CustomerAuthContextType = {
    profile,
    isAuthenticated: Boolean(profile),
    checking,
    error,
    refresh,
    logout,
    setProfile,
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextType {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return ctx;
}
