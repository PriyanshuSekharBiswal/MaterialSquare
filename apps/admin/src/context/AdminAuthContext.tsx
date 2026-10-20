import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AdminStaff } from "../components/AdminWorkspaceLayout";
import { StaffLoginSchema } from "@material-square/types";

const SESSION_MARKER = "staff-cookie-session";

export type AdminAuthContextType = {
  /** Non-secret UI marker. The credential itself stays in an HTTP-only cookie. */
  token: string;
  staff: AdminStaff | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  setStaff: React.Dispatch<React.SetStateAction<AdminStaff | null>>;
  setToken: (value: string) => void;
  signOut: () => void;
  login: (formData: FormData) => Promise<void>;
  request: <T>(
    path: string,
    method?: string,
    body?: unknown,
    timeoutMs?: number,
    callerSignal?: AbortSignal,
  ) => Promise<T>;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

function apiErrorMessage(data: any, path: string): string {
  const fieldErrors = data?.issues?.fieldErrors;
  const loginField =
    path === "/auth/staff/login" && fieldErrors
      ? ["phone", "email", "password"].find(
          (field) => fieldErrors[field]?.length,
        )
      : undefined;
  if (loginField === "phone") {
    return "Enter a valid 10-digit Indian mobile number (with optional +91).";
  }
  if (loginField === "email") return "Enter a valid email address.";
  if (loginField === "password") return "Check your password: use at least 8 characters.";
  return data?.message || "Unable to connect. Please try again.";
}

export function AdminAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [token, setTokenState] = useState(() => {
    try {
      // Clear bearer tokens written by the previous browser-storage flow.
      localStorage.removeItem("ms-staff-token");
      sessionStorage.removeItem("ms-staff-token");
    } catch {}
    return "";
  });
  const [staff, setStaff] = useState<AdminStaff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const setToken = useCallback((value: string) => {
    setTokenState(value ? SESSION_MARKER : "");
    if (!value) setStaff(null);
  }, []);

  const request = useCallback(
    async <T,>(
      path: string,
      method = "GET",
      body?: unknown,
      timeoutMs = 65000,
      callerSignal?: AbortSignal,
    ): Promise<T> => {
      let response: Response;
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      let cleanupSignalListeners = () => {};
      let requestSignal = timeoutSignal;
      if (callerSignal) {
        if (typeof AbortSignal.any === "function") {
          requestSignal = AbortSignal.any([timeoutSignal, callerSignal]);
        } else {
          const combined = new AbortController();
          const forwardTimeout = () => combined.abort(timeoutSignal.reason);
          const forwardCaller = () => combined.abort(callerSignal.reason);
          if (callerSignal.aborted) combined.abort(callerSignal.reason);
          timeoutSignal.addEventListener("abort", forwardTimeout, { once: true });
          callerSignal.addEventListener("abort", forwardCaller, { once: true });
          cleanupSignalListeners = () => {
            timeoutSignal.removeEventListener("abort", forwardTimeout);
            callerSignal.removeEventListener("abort", forwardCaller);
          };
          requestSignal = combined.signal;
        }
      }
      try {
        try {
          response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}${path}`, {
            method,
            credentials: "include",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: requestSignal,
          });
        } catch (cause) {
          if (callerSignal?.aborted) throw cause;
          throw new Error(
            "The workspace is taking longer than usual to respond. Please try again shortly.",
          );
        }

        if (response.status === 204) return undefined as T;
        const data = await response.json().catch((cause) => {
          if (requestSignal.aborted) {
            if (callerSignal?.aborted) throw cause;
            throw new Error(
              "The workspace is taking longer than usual to respond. Please try again shortly.",
            );
          }
          return null;
        });
        if (!response.ok) {
          if (response.status === 401 && path !== "/auth/staff/login") {
            setToken("");
          }
          if (response.status >= 500) {
            throw new Error(
              "The workspace is temporarily unavailable. Please try again shortly.",
            );
          }
          throw new Error(apiErrorMessage(data, path));
        }
        return data as T;
      } finally {
        cleanupSignalListeners();
      }
    },
    [setToken],
  );

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      setLoading(true);
      setError("");
      try {
        const current = await request<AdminStaff>(
          "/auth/staff/me",
          "GET",
          undefined,
          8000,
        );
        if (active) {
          setStaff(current);
          setToken(SESSION_MARKER);
        }
      } catch (cause) {
        if (active) {
          setToken("");
          const message = cause instanceof Error ? cause.message : "";
          if (message !== "Unauthorized") setError(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, [request, setToken]);

  const login = useCallback(
    async (formData: FormData) => {
      setError("");
      const parsed = StaffLoginSchema.safeParse({
        ...(String(formData.get("identifier") || "").includes("@")
          ? { email: String(formData.get("identifier")).trim().toLowerCase() }
          : { phone: String(formData.get("identifier") || "") }),
        password: formData.get("password"),
      });
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues[0]?.message || "Check your sign-in details",
        );
      }

      try {
        await request<{ ok: true }>("/auth/staff/login", "POST", parsed.data);
        setLoading(true);
        const current = await request<AdminStaff>(
          "/auth/staff/me",
          "GET",
          undefined,
          8000,
        );
        setStaff(current);
        setToken(SESSION_MARKER);
      } catch (cause) {
        setToken("");
        setError(cause instanceof Error ? cause.message : "Unable to sign in.");
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [request, setToken],
  );

  const signOut = useCallback(() => {
    setToken("");
    setStaff(null);
    setError("");
    void request<{ ok: true }>("/auth/staff/logout", "POST")
      .catch(() => undefined);
  }, [request, setToken]);

  const value: AdminAuthContextType = {
    token,
    staff,
    isAuthenticated: Boolean(token && staff),
    loading,
    error,
    setError,
    setStaff,
    setToken,
    signOut,
    login,
    request,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return ctx;
}
