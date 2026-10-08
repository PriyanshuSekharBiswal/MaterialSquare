import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomer } from "../customer";
import { customerApi } from "../api";
import type { CatalogueProduct } from "../types";
import { trackWebsiteEvent } from "../analytics";
import {
  emailLink,
  whatsappLink,
  requestMessage,
  type RequestDetails,
} from "../messages";
import { useSiteContent } from "../site-content";
import type { PendingRfq, Profile } from "../features/customer-account/model";
import {
  getRfqAttachmentValidationError,
  RFQ_ATTACHMENT_MAX_FILE_BYTES,
  RFQ_ATTACHMENT_MAX_FILES,
} from "@material-square/types";
export default function RequestContactForm({
  enquiry = false,
  products = [],
}: {
  enquiry?: boolean;
  products?: CatalogueProduct[];
}) {
  const { items, ready, updateItems } = useCustomer();
  const navigate = useNavigate();
  const siteContent = useSiteContent();
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
  const [channel, setChannel] = useState<"whatsapp" | "email" | "copy">(
      siteContent["contact.phone"]
        ? "whatsapp"
        : siteContent["contact.email"]
          ? "email"
          : "copy",
    ),
    [prepared, setPrepared] = useState(false),
    [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sessionState, setSessionState] = useState<
    "checking" | "signed-in" | "guest"
  >(enquiry ? "guest" : "checking");
  useEffect(() => {
    if (enquiry) return;
    let active = true;
    void customerApi<Profile>("/customer/me", "GET", undefined, undefined, 12000)
      .then((profile) => {
        if (!active) return;
        setSessionState("signed-in");
        const digits = profile.phone.replace(/\D/g, "");
        const mobile = digits.startsWith("91") && digits.length === 12
          ? digits.slice(2)
          : digits;
        setDetails((current) => ({
          ...current,
          name: current.name || profile.name,
          phone: current.phone || mobile,
          email: current.email || profile.email || "",
          company: current.company || profile.companyName || "",
          address:
            current.address ||
            profile.shippingAddress ||
            profile.billingAddress ||
            "",
          city: current.city || profile.city,
          pincode: current.pincode || profile.pincode,
        }));
      })
      .catch(() => {
        if (active) setSessionState("guest");
      });
    return () => {
      active = false;
    };
  }, [enquiry]);
  function update(key: keyof RequestDetails, value: string) {
    setPrepared(false);
    setCopied(false);
    setDetails((old) => ({ ...old, [key]: value }));
  }
  useEffect(() => {
    setPrepared(false);
    setCopied(false);
  }, [items]);
  useEffect(() => {
    if (channel !== "copy") return;
    if (siteContent["contact.phone"]) setChannel("whatsapp");
    else if (siteContent["contact.email"]) setChannel("email");
  }, [channel, siteContent["contact.email"], siteContent["contact.phone"]]);
  const message = requestMessage(details, items, enquiry);
  async function submitQuoteRequest() {
    setError("");
    const belowMinimum = items.find(
      (item) =>
        item.minOrderQuantity != null &&
        Number(item.quantity || 0) < Number(item.minOrderQuantity),
    );
    if (belowMinimum) {
      setError(
        `${belowMinimum.name} requires a minimum of ${belowMinimum.minOrderQuantity} ${belowMinimum.unit}.`,
      );
      return;
    }
    setSubmitting(true);
    const payload = {
      customerName: details.name.trim(),
      email: details.email.trim(),
      companyName: details.company.trim(),
      siteLocation: details.address.trim(),
      city: details.city.trim(),
      pincode: details.pincode.trim(),
      deliveryTiming: details.delivery,
      projectStage: "",
      notes: details.notes.trim(),
      items: items.map((item) => {
        const candidateId = item.catalogueId || item.id;
        const product = products.find((entry) => entry.id === candidateId);
        const variant = product?.variants?.find(
          (entry) => entry.id === item.variantId,
        );
        return {
          ...(product ? { catalogueId: product.id } : {}),
          ...(variant ? { variantId: variant.id } : {}),
          name: product?.name || item.name,
          brand: product?.brand || item.brand,
          category: product?.categoryLabel || item.category || "",
          unit: item.unit,
          quantity: Number(item.quantity || 1),
          specification: item.specification || "",
        };
      }),
    };
    try {
      const requestBody: FormData | typeof payload = attachments.length
        ? new FormData()
        : payload;
      if (requestBody instanceof FormData) {
        requestBody.append("payload", JSON.stringify(payload));
        attachments.forEach((file) => requestBody.append("attachments", file));
      }
      const result = await customerApi<{ id: string }>(
        "/customer/rfqs",
        "POST",
        requestBody,
        undefined,
        attachments.length ? 20 * 60 * 1000 : 65000,
      );
      updateItems([]);
      navigate("/account/quotations", {
        state: {
          notice: `Request ${result.id.slice(0, 8).toUpperCase()} was sent to the team.`,
        },
      });
    } catch (cause) {
      if (cause instanceof Error && "status" in cause && cause.status === 401) {
        navigate("/account", {
          state: {
            pendingRfq: { ...payload, attachments } as PendingRfq,
          },
        });
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not submit the request.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }
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
      required: enquiry && channel === "email",
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
      <h2>{enquiry ? "Send an enquiry" : "Your project & delivery details"}</h2>
      <p>
        Confirm the site location for this request. Our team will discuss
        availability and delivery with you.
      </p>
      {!enquiry && (
        <div className="request-plan-guidance">
          <strong>Not sure what materials or quantities you need?</strong>
          <span>
            Add a house plan, handwritten sketch, bill of quantities (BOQ), or
            site photo. Our team can review it with you. Final quantities should
            be checked against approved drawings by your project professional.
          </span>
        </div>
      )}
      <form
        className="customer-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (!enquiry && !items.length && !attachments.length) {
            setError(
              "Add a material or attach a project plan so the team knows what to help with.",
            );
            return;
          }
          if (!enquiry && items.some((i) => !i.unit.trim())) {
            setError("Enter a unit for every material.");
            return;
          }
          if (
            enquiry &&
            channel === "whatsapp" &&
            !siteContent["contact.phone"]
          ) {
            setError("WhatsApp contact is not configured. Choose email.");
            return;
          }
          if (enquiry && channel === "email" && !siteContent["contact.email"]) {
            setError("Email contact is not configured. Choose WhatsApp.");
            return;
          }
          if (
            fields.some(
              (f) =>
                f.required &&
                (enquiry || f.key !== "phone") &&
                !details[f.key].trim(),
            ) ||
            (enquiry && !details.notes.trim())
          ) {
            setError("Please complete the required details.");
            return;
          }
          setPrepared(true);
        }}
      >
        <fieldset className="request-fields">
          {enquiry && (
            <label>
              Preferred contact channel
              <select
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as typeof channel);
                  setPrepared(false);
                  setCopied(false);
                }}
              >
                <option
                  value="whatsapp"
                  disabled={!siteContent["contact.phone"]}
                >
                  WhatsApp
                </option>
                <option value="email" disabled={!siteContent["contact.email"]}>
                  Email
                </option>
                <option value="copy">Copy message</option>
              </select>
            </label>
          )}
          {fields
            .filter((field) => enquiry || field.key !== "phone")
            .map((field) => (
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
          {!enquiry && (
            <label className="request-plan-upload">
              Project plans, sketches or BOQ <span>(optional)</span>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
                multiple
                onChange={(event) => {
                  const selected = Array.from(event.currentTarget.files || []);
                  const uploadError = getRfqAttachmentValidationError(selected);
                  if (uploadError) {
                    setError(uploadError);
                    event.currentTarget.value = "";
                    return;
                  }
                  setError("");
                  setAttachments(selected);
                  setPrepared(false);
                }}
              />
              <span className="customer-help">
                PDF, JPG, PNG or WebP · up to {RFQ_ATTACHMENT_MAX_FILES} files ·{" "}
                {RFQ_ATTACHMENT_MAX_FILE_BYTES / (1024 * 1024)} MB each. Files
                are visible only to you and authorized staff on this request.
              </span>
              {attachments.length > 0 && (
                <ul className="request-plan-file-list">
                  {attachments.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`}>
                      <span>
                        {file.name} · {(file.size / (1024 * 1024)).toFixed(1)}{" "}
                        MB
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => {
                          setAttachments((current) =>
                            current.filter((_, i) => i !== index),
                          );
                          setPrepared(false);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>
          )}
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
              <h3>
                {enquiry
                  ? `${channel === "copy" ? "Copy your" : "Send your"} enquiry${channel === "copy" ? " message" : ` through ${channel === "email" ? "email" : "WhatsApp"}`}`
                  : "Review your quotation request"}
              </h3>
              <pre className="request-preview">{message}</pre>
              {!enquiry && attachments.length > 0 && (
                <div className="request-plan-preview-files">
                  <strong>Project files included with your request</strong>
                  <ul>
                    {attachments.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`}>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="customer-help">
                {!enquiry ? (
                  sessionState === "signed-in"
                    ? "Your verified customer session will be used. You will not need to sign in again."
                    : "Your request will be saved to your account and sent to the team after you verify your mobile number."
                ) : channel === "copy" ? (
                  "Review the details, copy the message, and paste it into your preferred messaging app."
                ) : (
                  <>
                    Review the details, then press Send in{" "}
                    {channel === "email" ? "your email app" : "WhatsApp"}.
                    Opening the app does not send this message automatically.
                    Attach drawings or photos there if needed.
                  </>
                )}
              </p>
              {enquiry && channel !== "copy" && (
                <a
                  className={`btn ${channel === "whatsapp" ? "btn-whatsapp" : "btn-primary"}`}
                  href={
                    channel === "whatsapp"
                      ? whatsappLink(message, siteContent["contact.phone"])
                      : emailLink(
                          `Material Square — ${enquiry ? "Enquiry" : "Quotation Request"} — ${details.name}`,
                          message,
                          siteContent["contact.email"],
                        )
                  }
                  target={channel === "whatsapp" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackWebsiteEvent({
                      type: "request_handoff",
                      target: channel === "email" ? "email" : "whatsapp",
                    })
                  }
                >
                  Continue in {channel === "whatsapp" ? "WhatsApp" : "email"}
                </a>
              )}
              {enquiry && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(message);
                      setError("");
                      setCopied(true);
                    } catch {
                      setError(
                        "Copy is unavailable. Select the preview text and copy it manually.",
                      );
                    }
                  }}
                >
                  {channel === "copy" ? "Copy request message" : "Copy message"}
                </button>
              )}
              {enquiry && copied && (
                <p role="status" className="customer-help">
                  Message copied. Paste it into your messaging app to send it.
                </p>
              )}
              {enquiry && (
                <p className="customer-help">
                  For long lists or if your app does not open, copy the full
                  message and paste it into WhatsApp or email.
                </p>
              )}
              {!enquiry && (
                <div className="request-submit-actions">
                  <p className="customer-help">
                    The team will confirm pricing, stock and delivery; no online payment is taken.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submitting || sessionState === "checking"}
                    onClick={() => void submitQuoteRequest()}
                  >
                    {submitting
                      ? "Submitting request…"
                      : sessionState === "signed-in"
                        ? "Submit quotation request"
                        : "Verify phone & request quotation"}
                  </button>
                </div>
              )}
            </div>
          )}
        </fieldset>
      </form>
    </div>
  );
}
