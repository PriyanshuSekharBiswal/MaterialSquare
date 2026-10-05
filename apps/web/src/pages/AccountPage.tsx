import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi } from "../api";
import { useCustomer } from "../customer";
import { retryMsg91Otp, sendMsg91Otp, verifyMsg91Otp } from "../msg91-widget";
import CustomerActivity from "./CustomerActivity";
export default function AccountPage() {
  const { customer, ready, load, logout, saveProfile, saving } = useCustomer();
  const [phone, setPhone] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const [msg91ReqId, setMsg91ReqId] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnTo =
    params.get("next") === "/get-quote" ? "/get-quote" : "/marketplace";
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function request() {
    setBusy(true);
    setError("");
    try {
      const reqId = sent
        ? await retryMsg91Otp(msg91ReqId)
        : await sendMsg91Otp(phone);
      setMsg91ReqId(reqId);
      setCooldown(60);
      setSent(true);
      setNotice("A six-digit verification code has been sent to your mobile number.");
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
      const accessToken = await verifyMsg91Otp(otp, msg91ReqId);
      await customerApi("/auth/customer/otp/verify-msg91", "POST", {
        phone,
        accessToken,
      });
      await load(true);
      setNotice("Signed in. Complete or review your details below.");
      navigate(returnTo, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-page container">
      <div className="account-heading">
        <span className="badge-pill">Your Material Square account</span>
        <h1>{customer ? "My Account" : "Welcome back"}</h1>
        <p>Keep your material list ready for your next site visit.</p>
      </div>
      {!ready ? (
        <p role="status">Loading your account…</p>
      ) : !customer ? (
        <div className="account-card">
          <h2>Sign in with your mobile</h2>
          <p>
            New here? Verify your number, then add your name. No password
            needed.
          </p>
          <form
            className="customer-form"
            onSubmit={
              sent
                ? verify
                : (e) => {
                    e.preventDefault();
                    void request();
                  }
            }
          >
            <label>
              Mobile number
              <input
                autoComplete="tel-national"
                inputMode="numeric"
                type="tel"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                required
                value={phone}
                disabled={sent}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              />
            </label>
            <div
              id="msg91-captcha"
              className="msg91-captcha"
              aria-label="SMS security check"
            />
            {sent && (
              <>
                <label>
                  Six-digit OTP
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
                <div className="customer-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy || cooldown > 0}
                    onClick={request}
                  >
                    {cooldown ? `Resend in ${cooldown}s` : "Resend OTP"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setSent(false);
                      setOtp("");
                      setMsg91ReqId("");
                      setNotice("");
                    }}
                  >
                    Change number
                  </button>
                </div>
              </>
            )}
            <button disabled={busy} className="btn btn-primary">
              {busy ? "Please wait…" : sent ? "Verify & sign in" : "Send OTP"}
            </button>
          </form>
          <p className="customer-help">
            You can stay signed in on this browser for up to 30 days.
          </p>
        </div>
      ) : (
        <div className="account-grid">
          <div className="account-card">
            <h2>{customer.name ? "Your details" : "Complete your profile"}</h2>
            <p>Verified mobile: +91 {customer.phone}</p>
            <form
              key={customer.id}
              className="customer-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  await saveProfile(
                    Object.fromEntries(new FormData(e.currentTarget)),
                  );
                  setNotice("Profile saved.");
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Full name *
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={customer.name}
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  defaultValue={customer.email || ""}
                />
              </label>
              <label>
                Company (optional)
                <input
                  name="companyName"
                  maxLength={150}
                  defaultValue={customer.companyName || ""}
                />
              </label>
              <label>
                Site / delivery address
                <textarea
                  name="shippingAddress"
                  maxLength={500}
                  autoComplete="street-address"
                  defaultValue={customer.shippingAddress || ""}
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  maxLength={100}
                  autoComplete="address-level2"
                  defaultValue={customer.city}
                />
              </label>
              <label>
                PIN code
                <input
                  name="pincode"
                  inputMode="numeric"
                  pattern="[1-9][0-9]{5}"
                  maxLength={6}
                  autoComplete="postal-code"
                  defaultValue={customer.pincode}
                />
              </label>
              <button disabled={busy} className="btn btn-primary">
                {busy ? "Saving…" : "Save profile"}
              </button>
            </form>
          </div>
          <div className="account-card">
            <h2>Your material list</h2>
            <p>
              Your saved materials are available when you sign in on another
              device. Quotations and conversations take place directly through
              WhatsApp or email.
            </p>
            <Link className="btn btn-primary" to="/get-quote">
              Review material list
            </Link>
            <Link className="btn btn-secondary" to={returnTo}>
              Continue
            </Link>
            <button
              className="btn btn-secondary"
              disabled={busy || saving}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await logout();
                  setNotice("Signed out. Your account list is saved.");
                  setSent(false);
                  setOtp("");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Log out
            </button>
          </div>
        </div>
      )}
      {customer && <CustomerActivity key={customer.id} customerId={customer.id} />}
      {error && (
        <p role="alert" className="customer-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="customer-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
