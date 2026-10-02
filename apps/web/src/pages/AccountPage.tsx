import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { customerApi } from "../api";
import { useCustomer } from "../customer";
import { retryMsg91Otp, sendMsg91Otp, verifyMsg91Otp } from "../msg91-widget";
type CustomerActivity = {
  requests: {
    id: string;
    status: string;
    siteLocation: string;
    createdAt: string;
  }[];
  quotations: {
    id: string;
    quoteNumber: string;
    status: string;
    totalAmount: string;
    validUntil: string;
    createdAt: string;
  }[];
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: string;
    loyaltyDiscountAmount: string;
    createdAt: string;
  }[];
  loyalty: {
    pointsBalance: number;
    transactions: { id: string; type: string; points: number; description: string; createdAt: string }[];
  } | null;
};
export default function AccountPage() {
  const { customer, ready, load, logout, saveProfile, saving } = useCustomer();
  const [phone, setPhone] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [cooldown, setCooldown] = useState(0);
  const [demoNumbers, setDemoNumbers] = useState<string[]>([]);
  const [demoOtp, setDemoOtp] = useState("");
  const [msg91ReqId, setMsg91ReqId] = useState("");
  const [activity, setActivity] = useState<CustomerActivity | null>(null);
  const [activityError, setActivityError] = useState("");
  const [activityBusy, setActivityBusy] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<Record<string, string>>({});
  useEffect(() => {
    void customerApi<{ demo: boolean; customerPhones: string[] }>("/auth/mode")
      .then((mode) => setDemoNumbers(mode.demo ? mode.customerPhones : []))
      .catch(() => {});
  }, []);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnTo =
    params.get("next") === "/get-quote" ? "/get-quote" : "/marketplace";
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function refreshActivity() {
    if (!customer) return;
    setActivityBusy(true);
    setActivityError("");
    try {
      setActivity(
        await customerApi<CustomerActivity>(
          "/customer/activity",
          "GET",
          undefined,
          customer.id,
        ),
      );
    } catch {
      setActivityError("Could not load your requests and order history.");
    } finally {
      setActivityBusy(false);
    }
  }
  useEffect(() => {
    if (customer) void refreshActivity();
    else setActivity(null);
  }, [customer?.id]);
  async function request() {
    setBusy(true);
    setError("");
    try {
      if (demoNumbers.length > 0) {
        const result = await customerApi<{
          demoOtp?: string;
          retryAfterSeconds?: number;
        }>("/auth/customer/otp/request", "POST", { phone });
        setDemoOtp(result.demoOtp || "");
        setCooldown(result.retryAfterSeconds ?? 60);
      } else {
        const reqId = sent
          ? await retryMsg91Otp(msg91ReqId)
          : await sendMsg91Otp(phone);
        setMsg91ReqId(reqId);
        setDemoOtp("");
        setCooldown(60);
      }
      setSent(true);
      setNotice(demoNumbers.length > 0
        ? "Demo code generated below. No SMS was sent."
        : "A six-digit verification code has been sent by SMS.");
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
      if (demoNumbers.length > 0) {
        await customerApi("/auth/customer/otp/verify", "POST", { phone, otp });
      } else {
        const accessToken = await verifyMsg91Otp(otp, msg91ReqId);
        await customerApi("/auth/customer/otp/verify-msg91", "POST", {
          phone,
          accessToken,
        });
      }
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
          {demoNumbers.length > 0 && (
            <div className="demo-login-box">
              <strong>Demo accounts</strong>
              <p>
                Choose the same number on each device to use the same account.
              </p>
              <div className="customer-actions">
                {demoNumbers.map((number) => (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    key={number}
                    disabled={busy}
                    onClick={() => {
                      setPhone(number);
                      setSent(false);
                      setOtp("");
                      setDemoOtp("");
                      setMsg91ReqId("");
                      setNotice("");
                    }}
                  >
                    {number}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            {sent && (
              <>
                {demoOtp && (
                  <div className="demo-login-box">
                    <span>Demo OTP for {phone}</span>
                    <output aria-label="Demo OTP" className="demo-code">
                      {demoOtp}
                    </output>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setOtp(demoOtp)}
                    >
                      Use demo code
                    </button>
                    <small>
                      Expires in 5 minutes. A new request replaces the previous
                      code.
                    </small>
                  </div>
                )}
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
                      setDemoOtp("");
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
            <hr />
            <section aria-label="Loyalty points">
              <h2>Material Square points</h2>
              <p className="customer-help">Balance: <strong>{activity?.loyalty?.pointsBalance ?? 0} points</strong></p>
              {!!activity?.loyalty?.transactions.length && activity.loyalty.transactions.map((entry) => (
                <article className="workspace-record" key={entry.id}>
                  <div>
                    <strong>{entry.points > 0 ? "+" : ""}{entry.points} points · {entry.type}</strong>
                    <p>{entry.description}</p>
                    <small>{new Date(entry.createdAt).toLocaleDateString("en-IN")}</small>
                  </div>
                </article>
              ))}
            </section>
            <hr />
            <div className="workspace-actions">
              <h2>Requests, quotations & orders</h2>
              <button
                className="btn btn-secondary btn-sm"
                type="button"
                disabled={activityBusy}
                onClick={() => void refreshActivity()}
              >
                {activityBusy ? "Loading…" : "Refresh"}
              </button>
            </div>
            {activityError && <p role="alert" className="customer-error">{activityError}</p>}
            {activity && !activity.requests.length && !activity.quotations.length && !activity.orders.length && (
              <p className="customer-help">Your requests and orders will appear here as your project moves forward.</p>
            )}
            {!!activity?.requests.length && (
              <section aria-label="Quotation requests">
                <h3>Quotation requests</h3>
                {activity.requests.map((request) => (
                  <article className="workspace-record" key={request.id}>
                    <div>
                      <strong>Request {request.id.slice(0, 8)}</strong>
                      <p>{request.siteLocation}</p>
                      <small>{request.status} · {new Date(request.createdAt).toLocaleDateString("en-IN")}</small>
                    </div>
                  </article>
                ))}
              </section>
            )}
            {!!activity?.quotations.length && (
              <section aria-label="Quotations">
                <h3>Quotations</h3>
                {activity.quotations.map((quote) => (
                  <article className="workspace-record" key={quote.id}>
                    <div>
                      <strong>{quote.quoteNumber}</strong>
                      <p>₹{Number(quote.totalAmount).toLocaleString("en-IN")} · {quote.status}</p>
                      <small>Valid until {new Date(quote.validUntil).toLocaleDateString("en-IN")}</small>
                      <p><a href={`/api/customer/quotes/${quote.id}/pdf`} target="_blank" rel="noreferrer">View quotation PDF</a></p>
                    </div>
                    {quote.status === "QUOTE_SENT" && new Date(quote.validUntil) > new Date() && (
                      <div className="customer-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          disabled={activityBusy}
                          onClick={async () => {
                            setActivityBusy(true);
                            setError("");
                            try {
                              const result = await customerApi<{ orderNumber: string }>(
                                `/customer/quotes/${quote.id}/respond`,
                                "POST",
                                { decision: "ACCEPT" },
                                customer.id,
                              );
                              setNotice(`Quotation accepted. Order ${result.orderNumber} was created.`);
                              await refreshActivity();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Could not accept quotation.");
                            } finally {
                              setActivityBusy(false);
                            }
                          }}
                        >Accept & create order</button>
                        <button
                          className="btn btn-secondary btn-sm"
                          type="button"
                          disabled={activityBusy}
                          onClick={async () => {
                            setActivityBusy(true);
                            try {
                              await customerApi(
                                `/customer/quotes/${quote.id}/respond`,
                                "POST",
                                { decision: "REJECT" },
                                customer.id,
                              );
                              await refreshActivity();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Could not update quotation.");
                            } finally {
                              setActivityBusy(false);
                            }
                          }}
                        >Decline</button>
                      </div>
                    )}
                  </article>
                ))}
              </section>
            )}
            {!!activity?.orders.length && (
              <section aria-label="Orders">
                <h3>Orders</h3>
                {activity.orders.map((order) => (
                  <article className="workspace-record" key={order.id}>
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <p>{order.status} · ₹{Number(order.grandTotal).toLocaleString("en-IN")}</p>
                      {Number(order.loyaltyDiscountAmount) > 0 && <small>Points discount: ₹{Number(order.loyaltyDiscountAmount).toLocaleString("en-IN")}</small>}
                      <small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small>
                    </div>
                    {order.status === "PENDING_PAYMENT" && (activity.loyalty?.pointsBalance || 0) > 0 && Number(order.loyaltyDiscountAmount) === 0 && (
                      <form className="customer-actions" onSubmit={async (event) => {
                        event.preventDefault(); setActivityBusy(true); setError("");
                        try {
                          const result = await customerApi<{ discountAmount: string | number }>("/customer/orders/" + order.id + "/redeem-points", "POST", { points: Number(pointsToRedeem[order.id]) }, customer.id);
                          setNotice("Points applied. Your order total is reduced by ₹" + Number(result.discountAmount).toLocaleString("en-IN") + ".");
                          await refreshActivity();
                        } catch (e) { setError(e instanceof Error ? e.message : "Could not apply points."); }
                        finally { setActivityBusy(false); }
                      }}>
                        <input aria-label={"Points to apply to " + order.orderNumber} type="number" min="1" max={activity.loyalty?.pointsBalance || 0} step="1" value={pointsToRedeem[order.id] || ""} onChange={(event) => setPointsToRedeem((old) => ({ ...old, [order.id]: event.target.value }))} placeholder="Points to use" required />
                        <button className="btn btn-secondary btn-sm" disabled={activityBusy}>Apply points</button>
                      </form>
                    )}
                  </article>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
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
