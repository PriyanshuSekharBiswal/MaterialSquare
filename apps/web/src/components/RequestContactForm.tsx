import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomer } from "../customer";
import { customerApi } from "../api";
import {
  emailLink,
  whatsappLink,
  requestMessage,
  type RequestDetails,
} from "../messages";
export default function RequestContactForm({
  enquiry = false,
}: {
  enquiry?: boolean;
}) {
  const { customer, items, ready } = useCustomer();
  const [details, setDetails] = useState<RequestDetails>({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    city: "",
    pincode: "",
    delivery: "",
    notes: "",
  });
  const [channel, setChannel] = useState("whatsapp"),
    [prepared, setPrepared] = useState(false),
    [error, setError] = useState(""),
    [submitting, setSubmitting] = useState(false),
    [submittedId, setSubmittedId] = useState("");
  useEffect(() => {
    if (customer)
      setDetails((old) => ({
        ...old,
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        company: customer.companyName || "",
        address: customer.shippingAddress || "",
        city: customer.city,
        pincode: customer.pincode,
      }));
  }, [customer?.id]);
  function update(key: keyof RequestDetails, value: string) {
    setPrepared(false);
    setSubmittedId("");
    setDetails((old) => ({ ...old, [key]: value }));
  }
  useEffect(() => {
    setPrepared(false);
    setSubmittedId("");
  }, [items]);
  const message = requestMessage(details, items, enquiry);
  const fields: {
    key: keyof RequestDetails;
    label: string;
    required?: boolean;
    type?: string;
    pattern?: string;
    max: number;
    auto?: string;
  }[] = [
    { key: "name", label: "Full name", required: true, max: 100, auto: "name" },
    {
      key: "phone",
      label: "Mobile number",
      required: true,
      type: "tel",
      pattern: "[6-9][0-9]{9}",
      max: 10,
      auto: "tel-national",
    },
    {
      key: "company",
      label: "Company (optional)",
      max: 150,
      auto: "organization",
    },
    {
      key: "email",
      label: channel === "email" ? "Email address" : "Email address (optional)",
      required: channel === "email",
      type: "email",
      max: 254,
      auto: "email",
    },
    {
      key: "address",
      label: "Site / delivery address — building, street and locality",
      required: true,
      max: 500,
      auto: "street-address",
    },
    {
      key: "city",
      label: "City",
      required: true,
      max: 100,
      auto: "address-level2",
    },
    {
      key: "pincode",
      label: "PIN code",
      required: true,
      pattern: "[1-9][0-9]{5}",
      max: 6,
      auto: "postal-code",
    },
  ];
  return (
    <div className="request-card">
      <h2>{enquiry ? "Send an enquiry" : "Your contact & delivery details"}</h2>
      <p>
        Confirm the site location for this request. Our team will discuss
        availability and delivery with you.
      </p>
      {!enquiry && !customer ? (
        <div>
          <p>
            Sign in to save your list and include your verified mobile number.
          </p>
          <Link className="btn btn-primary" to="/account?next=/get-quote">
            Sign in to continue
          </Link>
        </div>
      ) : (
        <form
          className="customer-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!enquiry && !items.length) {
              setError(
                "Add at least one material before preparing your request.",
              );
              return;
            }
            if (!enquiry && items.some((i) => !i.unit.trim())) {
              setError("Enter a unit for every material.");
              return;
            }
            if (
              fields.some((f) => f.required && !details[f.key].trim()) ||
              (enquiry && !details.notes.trim())
            ) {
              setError("Please complete the required details.");
              return;
            }
            setPrepared(true);
          }}
        >
          <label>
            Preferred contact channel
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPrepared(false);
              }}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </select>
          </label>
          {fields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.required ? " *" : ""}
              <input
                type={field.type || "text"}
                autoComplete={field.auto}
                required={field.required}
                pattern={field.pattern}
                maxLength={field.max}
                minLength={field.key === "name" ? 2 : undefined}
                readOnly={field.key === "phone" && !!customer}
                value={details[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
              />
            </label>
          ))}
          {!enquiry && (
            <label>
              Preferred delivery date (optional)
              <input
                type="date"
                value={details.delivery}
                onChange={(e) => update("delivery", e.target.value)}
              />
              <span className="customer-help">
                Leave blank if undecided. Staff will confirm the delivery
                schedule.
              </span>
            </label>
          )}
          <label>
            {enquiry ? "Your question *" : "Additional instructions (optional)"}
            <textarea
              required={enquiry}
              rows={4}
              maxLength={2000}
              value={details.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
          <button className="btn btn-primary" disabled={!ready}>
            Preview {enquiry ? "enquiry" : "request"}
          </button>
          {error && (
            <p role="alert" className="customer-error">
              {error}
            </p>
          )}
          {prepared && (
            <div>
              {!enquiry && !submittedId && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={async () => {
                    if (!customer || !items.length) return;
                    setSubmitting(true);
                    setError("");
                    try {
                      const result = await customerApi<{ id: string }>(
                        "/rfqs",
                        "POST",
                        {
                          customerName: details.name,
                          customerEmail: details.email,
                          companyName: details.company,
                          shippingAddress: details.address,
                          city: details.city,
                          pincode: details.pincode,
                          siteLocation: [details.address, details.city, details.pincode]
                            .filter(Boolean)
                            .join(", "),
                          deliveryTiming: details.delivery || undefined,
                          notes: details.notes || undefined,
                          items: items.map((item) => ({
                            material: item.name,
                            brand: item.brand || undefined,
                            specification: item.specification || undefined,
                            quantity: item.quantity || 1,
                            unit: item.unit,
                          })),
                        },
                        customer.id,
                      );
                      setSubmittedId(result.id);
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not submit your request. Please try again.",
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? "Submitting…" : "Submit quotation request"}
                </button>
              )}
              {submittedId && (
                <p className="customer-notice" role="status">
                  Request submitted. Reference: {submittedId}. Our team will review it and prepare a quotation.
                </p>
              )}
              <h3>Your message</h3>
              <pre className="request-preview">{message}</pre>
              <p className="customer-help">
                Review the details, then press Send in{" "}
                {channel === "email" ? "your email app" : "WhatsApp"}. Opening
                the app does not send this message automatically. Attach
                drawings or photos there if needed.
              </p>
              <a
                className={`btn ${channel === "whatsapp" ? "btn-whatsapp" : "btn-primary"}`}
                href={
                  channel === "whatsapp"
                    ? whatsappLink(message)
                    : emailLink(
                        `Material Square — ${enquiry ? "Enquiry" : "Quotation Request"} — ${details.name}`,
                        message,
                      )
                }
                target={channel === "whatsapp" ? "_blank" : undefined}
                rel="noopener noreferrer"
              >
                Continue in {channel === "whatsapp" ? "WhatsApp" : "email"}
              </a>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message);
                    setError("");
                  } catch {
                    setError(
                      "Copy is unavailable. Select the preview text and copy it manually.",
                    );
                  }
                }}
              >
                Copy message
              </button>
              <p className="customer-help">
                For long lists or if your app does not open, copy the full
                message and paste it into WhatsApp or email.
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
