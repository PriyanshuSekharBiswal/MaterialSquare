import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomer } from "../customer";
import { customerApi } from "../api";
import { formatQuantityUnit } from "../quantity-format";
import type { CatalogueProduct } from "../types";
import { trackWebsiteEvent } from "../analytics";
import {
  emailLink,
  whatsappLink,
  requestMessage,
  type RequestDetails,
} from "../messages";
import { useSiteContent } from "../site-content";
import type {
  PendingInquiry,
  PendingRfq,
  Profile,
} from "../features/customer-account/model";
import ClientActionConfirmation, {
  type ClientActionConfirmationDetails,
} from "./ClientActionConfirmation";
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
  const selectedItems = items.filter((item) => item.includeInQuote !== false);
  const navigate = useNavigate();
  const siteContent = useSiteContent();
  const [details, setDetails] = useState<RequestDetails>({
    name: "",
    phone: "",
    email: "",
    company: "",
    address: "",
    building: "",
    landmark: "",
    state: "",
    city: "",
    pincode: "",
    delivery: "",
    notes: "",
  });
  const [channel, setChannel] = useState<"whatsapp" | "email" | "website">(
      siteContent["contact.phone"]
        ? "whatsapp"
        : siteContent["contact.email"]
          ? "email"
          : "website",
    ),
    [prepared, setPrepared] = useState(false),
    [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [websiteSubmitted, setWebsiteSubmitted] = useState(false);
  const [confirmation, setConfirmation] =
    useState<ClientActionConfirmationDetails | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sessionState, setSessionState] = useState<
    "checking" | "signed-in" | "guest"
  >("checking");
  useEffect(() => {
    let active = true;
    void customerApi<Profile>(
      "/customer/me",
      "GET",
      undefined,
      undefined,
      12000,
    )
      .then((profile) => {
        if (!active) return;
        setSessionState("signed-in");
        const digits = profile.phone.replace(/\D/g, "");
        const mobile =
          digits.startsWith("91") && digits.length === 12
            ? digits.slice(2)
            : digits;
        const savedAddress =
          profile.shippingAddress || profile.billingAddress || "";
        const addressPart = (label: string) =>
          savedAddress
            .match(
              new RegExp(
                `(?:^|,\\s*)${label}:\\s*(.*?)(?=,\\s*(?:Building|Area|Landmark|City|State):|$)`,
                "i",
              ),
            )?.[1]
            ?.trim() || "";
        setDetails((current) => ({
          ...current,
          name: current.name || profile.name,
          phone: current.phone || mobile,
          email: current.email || profile.email || "",
          company: current.company || profile.companyName || "",
          address: current.address || addressPart("Area") || savedAddress,
          building: current.building || addressPart("Building"),
          landmark: current.landmark || addressPart("Landmark"),
          state:
            current.state ||
            ["Delhi", "Haryana", "Uttar Pradesh"].find((state) =>
              savedAddress.includes(state),
            ) ||
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
  }, []);
  function update(key: keyof RequestDetails, value: string) {
    setPrepared(false);
    setWebsiteSubmitted(false);
    setDetails((old) => ({ ...old, [key]: value }));
  }
  useEffect(() => {
    setPrepared(false);
  }, [items]);
  useEffect(() => {
    if (!prepared || enquiry) return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [prepared, enquiry]);
  const fullAddress = [
    details.building.trim() && `Building: ${details.building.trim()}`,
    `Area: ${details.address.trim()}`,
    details.landmark.trim() && `Landmark: ${details.landmark.trim()}`,
    details.state && `State: ${details.state}`,
  ]
    .filter(Boolean)
    .join(", ");
  const message = requestMessage(
    { ...details, address: fullAddress },
    selectedItems,
    enquiry,
  );
  function validateDetails() {
    if (details.name.trim().length < 2)
      return "Enter your full name (at least 2 characters).";
    if (!/^[6-9]\d{9}$/.test(details.phone.trim()))
      return "Enter a valid 10-digit mobile number.";
    if (!details.building.trim())
      return "Enter your flat, house number or building.";
    if (details.address.trim().length < 4)
      return "Enter your site / delivery address, including the building, street and locality.";
    if (!details.state) return "Choose your state.";
    if (fullAddress.length > 500)
      return "Keep the complete address within 500 characters.";
    if (details.city.trim().length < 2) return "Enter your city.";
    if (!/^[1-9]\d{5}$/.test(details.pincode.trim()))
      return "Enter a valid 6-digit PIN code.";
    if (enquiry && channel === "email" && !details.email.trim())
      return "Enter your email address to use the email contact option.";
    if (
      details.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())
    )
      return "Enter a valid email address, or leave it blank when email is optional.";
    if (enquiry && !details.notes.trim())
      return "Enter your question so the team can help.";
    return "";
  }
  async function submitQuoteRequest() {
    setError("");
    const detailsError = validateDetails();
    if (detailsError) {
      setError(detailsError);
      setPrepared(false);
      return;
    }
    const belowMinimum = selectedItems.find(
      (item) =>
        item.minOrderQuantity != null &&
        Number(item.quantity || 0) < Number(item.minOrderQuantity),
    );
    if (belowMinimum) {
      setError(
        `${belowMinimum.name} requires a minimum of ${formatQuantityUnit(belowMinimum.minOrderQuantity, belowMinimum.unit)}.`,
      );
      return;
    }
    setSubmitting(true);
    const payload = {
      customerName: details.name.trim(),
      email: details.email.trim(),
      companyName: details.company.trim(),
      siteLocation: fullAddress,
      city: details.city.trim(),
      pincode: details.pincode.trim(),
      deliveryTiming: details.delivery,
      projectStage: "",
      notes: details.notes.trim(),
      items: selectedItems.map((item) => {
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
    if (sessionState !== "signed-in") {
      navigate("/account", {
        state: {
          pendingRfq: { ...payload, attachments } as PendingRfq,
        },
      });
      return;
    }
    try {
      const requestBody: FormData | typeof payload = attachments.length
        ? new FormData()
        : payload;
      if (requestBody instanceof FormData) {
        requestBody.append("payload", JSON.stringify(payload));
        attachments.forEach((file) => requestBody.append("attachments", file));
      }
      const result = await customerApi<{ id: string; requestNumber: string }>(
        "/customer/rfqs",
        "POST",
        requestBody,
        undefined,
        attachments.length ? 20 * 60 * 1000 : 65000,
      );
      updateItems((old) => old.filter((item) => item.includeInQuote === false));
      const notice = `Request ${result.requestNumber} was sent to the team.`;
      setConfirmation({
        title: "Quotation request sent",
        message: `${notice} You can review its status in your account quotations.`,
        actionLabel: "View quotations",
        onAction: () => navigate("/account/quotations", { state: { notice } }),
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
    {
      key: "name",
      label: "Full name (First and last name)",
      required: true,
      max: 100,
      auto: "name",
    },
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
      label:
        enquiry && channel === "email"
          ? "Email address"
          : "Email address (optional)",
      required: enquiry && channel === "email",
      type: "email",
      max: 254,
      auto: "email",
    },
    {
      key: "pincode",
      label: "PIN code",
      required: true,
      pattern: "[1-9][0-9]{5}",
      max: 6,
      auto: "postal-code",
    },
    {
      key: "building",
      label: "Flat, house no., building, company or apartment",
      required: true,
      max: 150,
      auto: "address-line1",
    },
    {
      key: "address",
      label: "Area, street, sector or village",
      required: true,
      max: 200,
      auto: "address-line2",
    },
    { key: "landmark", label: "Landmark (optional)", max: 100 },
    {
      key: "city",
      label: "Town / City",
      required: true,
      max: 100,
      auto: "address-level2",
    },
  ];
  return (
    <div className="request-card">
      <h2>
        {enquiry
          ? "Send an enquiry"
          : prepared
            ? "Review your quotation request"
            : "Your project & delivery details"}
      </h2>
      <p>
        {prepared && !enquiry
          ? "Review the products, quantities and delivery details below. Edit the details or submit the quotation when everything looks right."
          : "Confirm the site location for this request. Our team will discuss availability and delivery with you."}
      </p>
      {!enquiry && !prepared && (
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
          if (!enquiry && !selectedItems.length && !attachments.length) {
            setError(
              "Select at least one item for a quotation or attach a project plan.",
            );
            return;
          }
          if (!enquiry && selectedItems.some((i) => !i.unit.trim())) {
            setError("Enter a unit for each selected material.");
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
          const detailsError = validateDetails();
          if (detailsError) {
            setError(detailsError);
            return;
          }
          setPrepared(true);
        }}
      >
        <fieldset
          className={`request-fields${prepared && !enquiry ? " is-reviewing" : ""}`}
        >
          {enquiry && (
            <label>
              Preferred contact channel
              <select
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value as typeof channel);
                  setPrepared(false);
                  setWebsiteSubmitted(false);
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
                <option value="website">Website enquiry</option>
              </select>
            </label>
          )}
          {fields.map((field) => (
            <label
              key={field.key}
              className={
                field.key === "city" ? "request-city-field" : undefined
              }
            >
              {field.label}
              {field.required ? " *" : ""}
              <input
                type={field.type || "text"}
                autoComplete={field.auto}
                required={
                  field.required ||
                  (enquiry && channel === "website" && field.key === "phone")
                }
                pattern={field.pattern}
                maxLength={field.max}
                minLength={
                  field.key === "name" || field.key === "city"
                    ? 2
                    : field.key === "address"
                      ? 4
                      : undefined
                }
                placeholder={
                  field.key === "pincode"
                    ? "6-digit PIN code"
                    : field.key === "landmark"
                      ? "E.g. near Apollo Hospital"
                      : undefined
                }
                readOnly={
                  !enquiry &&
                  field.key === "phone" &&
                  sessionState === "signed-in"
                }
                value={details[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
              />
              {field.key === "phone" && (
                <small className="customer-help">
                  The team may use this number to coordinate your delivery.
                </small>
              )}
            </label>
          ))}
          <label className="request-state-field">
            State *
            <select
              required
              autoComplete="address-level1"
              value={details.state}
              onChange={(event) => update("state", event.target.value)}
            >
              <option value="">Choose a state</option>
              {["Delhi", "Haryana", "Uttar Pradesh"].map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
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
            <div className={enquiry ? undefined : "request-preview-step"}>
              <h3>
                {enquiry
                  ? channel === "website"
                    ? "Submit your enquiry on the website"
                    : `Send your enquiry through ${channel === "email" ? "email" : "WhatsApp"}`
                  : "Client & delivery details"}
              </h3>
              {!enquiry && error && (
                <p role="alert" className="customer-error">
                  {error}
                </p>
              )}
              {enquiry ? (
                <pre className="request-preview">{message}</pre>
              ) : (
                <dl className="request-customer-review">
                  <div>
                    <dt>Full name</dt>
                    <dd>{details.name.trim()}</dd>
                  </div>
                  <div>
                    <dt>Mobile number</dt>
                    <dd>+91 {details.phone.trim()}</dd>
                  </div>
                  {details.company.trim() && (
                    <div>
                      <dt>Company</dt>
                      <dd>{details.company.trim()}</dd>
                    </div>
                  )}
                  {details.email.trim() && (
                    <div>
                      <dt>Email address</dt>
                      <dd>{details.email.trim()}</dd>
                    </div>
                  )}
                  <div className="request-customer-review-location">
                    <dt>Delivery / site location</dt>
                    <dd>
                      {[details.building, details.address, details.landmark]
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .join(", ")}
                      <br />
                      {[details.city, details.state, details.pincode]
                        .map((part) => part.trim())
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Preferred delivery</dt>
                    <dd>{details.delivery || "Not decided"}</dd>
                  </div>
                  {details.notes.trim() && (
                    <div>
                      <dt>Additional instructions</dt>
                      <dd>{details.notes.trim()}</dd>
                    </div>
                  )}
                </dl>
              )}
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
                  sessionState === "signed-in" ? (
                    "Your verified customer session will be used. You will not need to sign in again."
                  ) : (
                    "Sign in with your mobile number and one-time code to save this request to your account."
                  )
                ) : websiteSubmitted ? (
                  "Your enquiry has been sent to the Material Square team. They can follow up using the details you provided."
                ) : channel === "website" ? (
                  sessionState === "checking" ? (
                    "Checking your sign-in status…"
                  ) : sessionState === "signed-in" ? (
                    "Your signed-in account will be used to send this enquiry."
                  ) : (
                    "Sign in with your mobile number and one-time code to send this enquiry."
                  )
                ) : (
                  <>
                    Review the details, then press Send in{" "}
                    {channel === "email" ? "your email app" : "WhatsApp"}.
                    Opening the app does not send this message automatically.
                    Attach drawings or photos there if needed.
                  </>
                )}
              </p>
              {enquiry && channel !== "website" && (
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
                  onClick={(event) => {
                    event.preventDefault();
                    const target = channel === "email" ? "email" : "whatsapp";
                    trackWebsiteEvent({ type: "request_handoff", target });
                    setConfirmation({
                      title: `Continue in ${channel === "email" ? "email" : "WhatsApp"}?`,
                      message: `Your enquiry is ready to open in ${channel === "email" ? "your email app" : "WhatsApp"}. You’ll need to press Send there to complete it.`,
                      actionLabel: `Open ${channel === "email" ? "email" : "WhatsApp"}`,
                      actionHref:
                        channel === "whatsapp"
                          ? whatsappLink(message, siteContent["contact.phone"])
                          : emailLink(
                              `Material Square — ${enquiry ? "Enquiry" : "Quotation Request"} — ${details.name}`,
                              message,
                              siteContent["contact.email"],
                            ),
                      actionTarget:
                        channel === "whatsapp" ? "_blank" : undefined,
                    });
                  }}
                >
                  Continue in {channel === "whatsapp" ? "WhatsApp" : "email"}
                </a>
              )}
              {enquiry && channel === "website" && !websiteSubmitted && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting || sessionState === "checking"}
                  onClick={async () => {
                    setError("");
                    const detailsError = validateDetails();
                    if (detailsError) {
                      setError(detailsError);
                      setPrepared(false);
                      return;
                    }
                    const inquiry: PendingInquiry = {
                      name: details.name.trim(),
                      phone: details.phone.trim(),
                      location: [
                        fullAddress,
                        details.city.trim(),
                        details.pincode.trim(),
                      ]
                        .filter(Boolean)
                        .join(", "),
                      projectType: "Website contact enquiry",
                      message: [
                        details.notes.trim(),
                        details.company.trim()
                          ? `Company: ${details.company.trim()}`
                          : "",
                        details.email.trim()
                          ? `Email: ${details.email.trim()}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join("\n\n"),
                    };
                    if (sessionState !== "signed-in") {
                      navigate("/account", {
                        state: { pendingInquiry: inquiry },
                      });
                      return;
                    }
                    setSubmitting(true);
                    try {
                      await customerApi<{ id: string }>(
                        "/inquiries",
                        "POST",
                        inquiry,
                      );
                      setWebsiteSubmitted(true);
                      setPrepared(true);
                      setConfirmation({
                        title: "Enquiry sent",
                        message:
                          "Your message was sent to the Material Square team. They can follow up using the contact details you provided.",
                      });
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "Could not send the enquiry.",
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting
                    ? "Sending enquiry…"
                    : sessionState === "signed-in"
                      ? "Send enquiry to the team"
                      : "Sign in to send enquiry"}
                </button>
              )}
              {!enquiry && (
                <div className="request-submit-actions">
                  <p className="customer-help">
                    The team will confirm pricing, stock and delivery; no online
                    payment is taken.
                  </p>
                  <div className="request-preview-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPrepared(false)}
                    >
                      Edit details
                    </button>
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
                          : "Sign in to request quotation"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </fieldset>
      </form>
      <ClientActionConfirmation
        confirmation={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </div>
  );
}
