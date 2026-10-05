import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Box,
  FileText,
  Gift,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  RefreshCw,
  UserRound,
  Wallet,
} from "lucide-react";
import { ApiError, customerApi } from "../api";
import {
  hasMsg91WidgetConfiguration,
  retryMsg91Otp,
  sendMsg91Otp,
  verifyMsg91Otp,
} from "../msg91-widget";

import type {
  AccountRouteState,
  Activity,
  PendingRfq,
  Profile,
} from "../features/customer-account/model";
import { emptyActivity } from "../features/customer-account/model";
import { AccountContent } from "./CustomerAccountContent";
import { useCustomer } from "../customer";

const nav = [
  { to: "/account", label: "Overview", icon: LayoutDashboard },
  { to: "/account/quotations", label: "Quotations", icon: FileText },
  {
    to: "/account/brand-comparison",
    label: "Brand comparison",
    icon: BadgeCheck,
  },
  { to: "/account/orders", label: "Orders & tracking", icon: PackageCheck },
  { to: "/account/history", label: "Purchase history", icon: Box },
  { to: "/account/loyalty", label: "Loyalty points", icon: Gift },
  { to: "/account/profile", label: "Profile", icon: UserRound },
];

export default function CustomerAccountPage() {
  const isLoopbackHost = ["localhost", "127.0.0.1", "::1"].includes(
    window.location.hostname,
  );
  const isLocalhostOtpTest =
    import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_LOCALHOST_OTP_TESTS === "true";
  const isLocalhost = isLoopbackHost && !isLocalhostOtpTest;
  const location = useLocation();
  const navigate = useNavigate();
  const { updateItems } = useCustomer();
  const routeState = location.state as AccountRouteState | null;
  const pendingRfq = routeState?.pendingRfq;
  const quoteId = location.pathname.match(
    /^\/account\/quotations\/([^/]+)$/,
  )?.[1];
  const orderId = location.pathname.match(/^\/account\/orders\/([^/]+)$/)?.[1];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activity, setActivity] = useState<Activity>(emptyActivity);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const pendingAttempted = useRef(false);
  const [pendingFailed, setPendingFailed] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const [me, data] = await Promise.all([
        customerApi<Profile>("/customer/me"),
        customerApi<Activity>("/customer/activity"),
      ]);
      setProfile(me);
      setActivity(data);
      setError("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setProfile(null);
      else setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (routeState?.notice) setNotice(routeState.notice);
  }, [routeState?.notice]);

  const submitPendingRfq = useCallback(async () => {
    if (!profile || !pendingRfq) return;
    setBusy(true);
    setError("");
    try {
      const result = await customerApi<{ id: string }>(
        "/customer/rfqs",
        "POST",
        pendingRfq,
        profile.id,
      );
      updateItems([]);
      const successNotice = `Request ${result.id.slice(0, 8).toUpperCase()} was sent to the team.`;
      const data = await customerApi<Activity>("/customer/activity");
      setActivity(data);
      setPendingFailed(false);
      navigate("/account/quotations", {
        replace: true,
        state: { notice: successNotice },
      });
      setNotice(successNotice);
    } catch (cause) {
      pendingAttempted.current = false;
      setPendingFailed(true);
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not submit your request.",
      );
    } finally {
      setBusy(false);
    }
  }, [navigate, pendingRfq, profile, updateItems]);

  useEffect(() => {
    if (!profile || !pendingRfq || pendingAttempted.current) return;
    pendingAttempted.current = true;
    void submitPendingRfq();
  }, [pendingRfq, profile, submitPendingRfq]);

  async function requestOtp(resend = false) {
    setBusy(true);
    setError("");
    try {
      const id = resend
        ? await retryMsg91Otp(requestId)
        : await sendMsg91Otp(phone);
      setRequestId(id);
      setSent(true);
      setCooldown(60);
      setNotice(`Verification code sent to +91 ${phone}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const accessToken = await verifyMsg91Otp(otp, requestId);
      await customerApi<Profile>("/auth/customer/otp/verify-msg91", "POST", {
        phone,
        accessToken,
      });
      setSent(false);
      setOtp("");
      // A completed login is implicit in the opened account workspace. Keep
      // this slot available for the more useful RFQ submission confirmation.
      setNotice("");
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await customerApi("/customer/logout", "POST", {}, profile?.id);
      setProfile(null);
      setActivity(emptyActivity);
      navigate("/account", { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError("");
    setNotice("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const saved = await customerApi<Profile>(
        "/customer/profile",
        "PUT",
        values,
        profile.id,
      );
      setProfile(saved);
      setNotice("Profile details saved.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedQuote = useMemo(
    () => activity.quotations.find((item) => item.id === quoteId),
    [activity.quotations, quoteId],
  );
  const selectedOrder = useMemo(
    () => activity.orders.find((item) => item.id === orderId),
    [activity.orders, orderId],
  );

  return (
    <section className="customer-account-shell">
      {!checking && !profile ? (
        <div className="account-auth-wrap">
          <div className="account-auth-card">
            <span className="account-eyebrow">MATERIAL SQUARE ACCOUNT</span>
            <h1>
              {sent ? "Verify your number" : "Your projects, in one place"}
            </h1>
            <p>
              {sent
                ? `Enter the code we sent to +91 ${phone}.`
                : "Sign in to see your quotations, orders, delivery updates and purchase history."}
            </p>
            <form
              onSubmit={
                sent
                  ? verify
                  : (e) => {
                      e.preventDefault();
                      void requestOtp();
                    }
              }
              className="account-auth-form"
            >
              {!sent ? (
                <label>
                  Mobile number
                  <div className="account-phone-field">
                    <span>+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      pattern="[6-9][0-9]{9}"
                      maxLength={10}
                      required
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </label>
              ) : (
                <label>
                  Six-digit verification code
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                </label>
              )}
              <div
                id="msg91-captcha"
                className="account-captcha"
                aria-label="SMS security check"
              />
              {sent && (
                <div className="account-auth-actions">
                  <button
                    type="button"
                    className="account-text-button"
                    disabled={busy || cooldown > 0 || isLocalhost}
                    onClick={() => void requestOtp(true)}
                  >
                    {cooldown ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                  <button
                    type="button"
                    className="account-text-button"
                    onClick={() => {
                      setSent(false);
                      setOtp("");
                      setRequestId("");
                    }}
                  >
                    Change number
                  </button>
                </div>
              )}
              <button
                className="account-primary-button"
                disabled={
                  busy ||
                  (sent && isLocalhost) ||
                  (!sent &&
                    (isLocalhost || !hasMsg91WidgetConfiguration()))
                }
              >
                {busy
                  ? "Please wait…"
                  : sent
                    ? "Verify and continue"
                    : "Continue with OTP"}
                <ArrowRight size={17} />
              </button>
            </form>
            {!sent && (isLocalhost || !hasMsg91WidgetConfiguration()) && (
              <p className="account-config-note" role="status">
                {isLocalhost
                  ? "Phone sign-in cannot be verified on localhost because MSG91 CAPTCHA requires an approved hostname. Use the approved HTTPS preview site; its MSG91 widget settings and API auth key must also be configured."
                  : "Phone sign-in is not configured in this environment yet. You can still browse products and build a guest material list."}
              </p>
            )}
            {sent && isLocalhost && (
              <p className="account-config-note" role="status">
                This code was requested on localhost, which MSG91 CAPTCHA does
                not allow. Open the approved HTTPS preview, request a fresh
                code there, and verify it on that same site.
              </p>
            )}
            {error && (
              <p className="account-alert" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="account-notice" role="status">
                {notice}
              </p>
            )}
            <small>
              By continuing, you agree to the site’s published terms and privacy
              policy.
            </small>
          </div>
        </div>
      ) : checking && !profile ? (
        <div className="account-loading" role="status">
          <RefreshCw className="account-spin" /> Loading account…
        </div>
      ) : profile ? (
        <div className="account-layout">
          <aside className="account-sidebar">
            <div className="account-side-brand">
              <span className="account-mark">M</span>
              <div>
                <strong>Material Square</strong>
                <small>Customer account</small>
              </div>
            </div>
            <div className="account-side-person">
              <span className="account-avatar">
                {profile.name ? profile.name.slice(0, 1).toUpperCase() : "C"}
              </span>
              <div>
                <strong>{profile.name || "Complete your profile"}</strong>
                <small>+91 {profile.phone}</small>
              </div>
            </div>
            <nav aria-label="Customer account navigation">
              {nav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`account-side-link ${location.pathname === to ? "is-active" : ""}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            <button
              type="button"
              className="account-logout"
              onClick={() => void logout()}
              disabled={busy}
            >
              <LogOut size={17} /> Sign out
            </button>
            <div className="account-side-help">
              <small>Need help?</small>
              <a href="/contact">
                Talk to our team <ArrowRight size={14} />
              </a>
            </div>
          </aside>
          <main className="account-main">
            <div className="account-mobile-top">
              <Link to="/" aria-label="Back to storefront">
                <ArrowLeft size={18} /> Storefront
              </Link>
              <button onClick={() => void logout()} disabled={busy}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
            {error && (
              <div className="account-alert account-page-alert" role="alert">
                {error}
              </div>
            )}
            {pendingFailed && pendingRfq && (
              <button
                className="account-primary-button account-page-alert"
                type="button"
                disabled={busy}
                onClick={() => void submitPendingRfq()}
              >
                {busy ? "Submitting request…" : "Retry quotation request"}
              </button>
            )}
            {notice && (
              <div className="account-notice account-page-alert" role="status">
                {notice}
              </div>
            )}
            <AccountContent
              path={location.pathname}
              profile={profile}
              activity={activity}
              quote={selectedQuote}
              order={selectedOrder}
              onSaveProfile={saveProfile}
              busy={busy}
            />
          </main>
        </div>
      ) : null}
    </section>
  );
}
