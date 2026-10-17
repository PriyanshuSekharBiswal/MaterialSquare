import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Download, X } from "lucide-react";
import MaterialSquareLogo from "../../components/MaterialSquareLogo";

type Listing = {
  id: string;
  name: string;
  brand: string;
  category?: string;
  unit: string;
  price: string | null;
  variants: { id: string; label: string; unit: string; price: string | null }[];
};
type Inventory = {
  id: string;
  name: string;
  unit: string;
  basePricePerMt: string;
  category?: string;
  brand?: { name: string };
};
type Selection = {
  key: string;
  productId?: string;
  catalogueId?: string;
  variantId?: string;
  name: string;
  brand: string;
  category?: string;
  unit: string;
  price: string;
  requested?: boolean;
  custom?: boolean;
};
type Line = {
  key: string;
  selection: string;
  quantity: string;
  rate: string;
  specification: string;
  requestedSummary?: string;
  requestedCatalogueId?: string | null;
  requestedVariantId?: string | null;
  requestedMaterial?: string;
  requestedBrand?: string;
  requestedUnit?: string;
  requestedCategory?: string;
  requestedOptionKey?: string;
  customName?: string;
  customUnit?: string;
  alternatives: {
    key: string;
    selection: string;
    quantity: string;
    rate: string;
    specification: string;
    customName?: string;
    customBrand?: string;
  }[];
};
type Rfq = {
  id: string;
  requestNumber?: string;
  customerName: string;
  customerPhone: string;
  siteLocation: string;
  customer?: {
    email?: string | null;
    companyName?: string | null;
    gstin?: string | null;
  } | null;
  items: {
    material: string;
    catalogueId?: string | null;
    variantId?: string | null;
    brand?: string;
    category?: string;
    quantity: number;
    unit: string;
    specification?: string;
  }[];
};
export type RevisionQuote = {
  id: string;
  requestId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  projectSiteAddress: string;
  sitePincode: string;
  notes?: string | null;
  validUntil: string;
  drawingFileUrl?: string | null;
  subtotal: string;
  marginAmount: string;
  discountAmount: string;
  taxAmount: string;
  freightAmount: string;
  marginPct?: string;
  items: {
    productId?: string | null;
    catalogueId?: string | null;
    variantId?: string | null;
    quantityMt: string;
    unitPrice: string;
    specification: string;
    options?: {
      id: string;
      productId?: string | null;
      catalogueId?: string | null;
      variantId?: string | null;
      quantityMt?: string;
      unitPrice: string;
      specification: string;
    }[];
  }[];
};
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
const blank = (): Line => ({
  key: crypto.randomUUID(),
  selection: "",
  quantity: "1",
  rate: "",
  specification: "",
  alternatives: [],
});
const serviceStates = ["Delhi", "Haryana", "Uttar Pradesh"];
const formatMoney = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const matchesComparisonProduct = (primary?: Selection, option?: Selection) =>
  Boolean(primary && option) &&
  (primary!.category || "Other materials").trim().toLocaleLowerCase() ===
    (option!.category || "Other materials").trim().toLocaleLowerCase() &&
  primary!.unit.trim().toLocaleLowerCase() === option!.unit.trim().toLocaleLowerCase();
const cleanQuoteSpecification = (value: string, unit: string) => {
  const normalize = (part: string) => part.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "").trim();
  const parts: string[] = [];
  for (const part of value.split(/\s*[·•|]\s*/).map((entry) => entry.trim()).filter(Boolean)) {
    const normalized = normalize(part);
    if (parts.some((existing) => {
      const prior = normalize(existing);
      return prior === normalized || prior.includes(normalized);
    })) continue;
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (normalized.includes(normalize(parts[index]))) parts.splice(index, 1);
    }
    parts.push(part);
  }
  const unitSize = unit.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm|kg|mt|tonnes?|g|ml|l|m)\b/i);
  if (unitSize) {
    const pack = normalize(`${unitSize[1]}${unitSize[2]}`);
    return parts.filter((part) => !normalize(part).startsWith(pack)).join(" · ");
  }
  return parts.join(" · ");
};
const groupRequestedItems = (items: Rfq["items"]) => {
  const grouped = new Map<string, Rfq["items"][number]>();
  for (const item of items) {
    const fallback = (value?: string | null) =>
      (value || "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const key = [
      item.catalogueId || fallback(item.material),
      item.variantId || fallback(item.specification),
      fallback(item.brand),
      fallback(item.unit),
    ].join("|");
    const existing = grouped.get(key);
    if (existing) existing.quantity += item.quantity;
    else grouped.set(key, { ...item });
  }
  return [...grouped.values()];
};

export default function QuoteEditor({
  inventory,
  request,
  initialRequest,
  linkedRequestNumber,
  revision,
  customQuotation = false,
  editing = false,
  onCancel,
  downloadPdf,
  onSaved,
}: {
  inventory: Inventory[];
  request: Request;
  initialRequest: Rfq | null;
  linkedRequestNumber?: string;
  revision?: RevisionQuote | null;
  customQuotation?: boolean;
  editing?: boolean;
  onCancel?: () => void;
  downloadPdf?: (path: string, filename: string) => Promise<void>;
  onSaved: () => Promise<void>;
}) {
  const [catalogue, setCatalogue] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestingLineKey, setSuggestingLineKey] = useState<string | null>(null);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const [suggestingAlternativeKey, setSuggestingAlternativeKey] = useState<string | null>(null);
  const [alternativeSuggestionQuery, setAlternativeSuggestionQuery] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [comparisonPromptOpen, setComparisonPromptOpen] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(
    () => Boolean(revision?.items.some((item) => item.options?.length)),
  );
  const [freight, setFreight] = useState(revision?.freightAmount || "0");
  const [taxPct, setTaxPct] = useState(() => {
    if (!revision) return "18";
    const taxableBase =
      Number(revision.subtotal) +
      Number(revision.marginAmount) -
      Number(revision.discountAmount);
    return taxableBase > 0
      ? ((100 * Number(revision.taxAmount)) / taxableBase).toFixed(2)
      : "18";
  });
  const [previewSnapshot, setPreviewSnapshot] = useState<{
    requestNumber: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    companyName: string;
    gstin: string;
    siteAddress: string;
    addressFields: { label: string; value: string }[];
    notes: string;
    freight: number;
    taxPct: number;
    subtotal: number;
    taxEstimate: number;
    estimatedTotal: number;
    items: {
      name: string;
      specification: string;
      quantity: number;
      unit: string;
      rate: number;
      alternatives: { name: string; specification: string; quantity: number; unit: string; rate: number }[];
    }[];
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const customerSectionRef = useRef<HTMLElement>(null);
  const itemsSectionRef = useRef<HTMLElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const [lines, setLines] = useState<Line[]>(
    () =>
      revision
        ? revision.items.map((item) => ({
            ...blank(),
            selection: item.variantId
              ? `variant:${item.variantId}`
              : item.catalogueId
                ? `catalogue:${item.catalogueId}`
                : `inventory:${item.productId}`,
            quantity: item.quantityMt,
            rate: item.unitPrice,
            specification: item.specification,
            alternatives:
              item.options?.map((option) => ({
                key: option.id,
                selection: option.variantId
                  ? `variant:${option.variantId}`
                  : option.catalogueId
                    ? `catalogue:${option.catalogueId}`
                    : `inventory:${option.productId}`,
                quantity: option.quantityMt || item.quantityMt,
                rate: option.unitPrice,
                specification: option.specification,
              })) || [],
          }))
        : initialRequest?.items.length
          ? groupRequestedItems(initialRequest.items).map((item, index) => ({
              ...blank(),
              selection: item.variantId
                ? `variant:${item.variantId}`
                : item.catalogueId
                  ? `catalogue:${item.catalogueId}`
                  : `request:${index}`,
              quantity: String(item.quantity),
              specification: cleanQuoteSpecification(item.specification || "", item.unit),
              requestedCatalogueId: item.catalogueId,
              requestedVariantId: item.variantId,
              requestedMaterial: item.material,
              requestedBrand: item.brand,
              requestedUnit: item.unit,
              requestedCategory: item.category,
              requestedOptionKey: `request:${index}`,
              requestedSummary: [
                item.material,
                item.brand,
                `${item.quantity} × ${item.unit}`,
              ]
                .filter(Boolean)
                .join(" · "),
            }))
          : [blank()],
  );
  const initialSiteAddress =
    revision?.projectSiteAddress || initialRequest?.siteLocation || "";
  const getAddressPart = (label: string) => {
    const match = initialSiteAddress.match(
      new RegExp(`(?:^|,\\s*)${label}:\\s*(.*?)(?=,\\s*(?:Building|Area|Landmark|City|State):|$)`, "i"),
    );
    return match?.[1]?.trim() || "";
  };
  const hasStructuredAddress = /(?:^|,\s*)(?:Building|Area|Landmark|City|State):/i.test(
    initialSiteAddress,
  );
  const initialStreet = getAddressPart("Area") || (!hasStructuredAddress
    ? initialSiteAddress.replace(/\b[1-9][0-9]{5}\b/g, "").replace(/[\s,]+$/, "")
    : "");
  const initialPincode =
    revision?.sitePincode ||
    initialRequest?.siteLocation.match(/\b[1-9][0-9]{5}\b/)?.[0] ||
    initialSiteAddress.match(/\b[1-9][0-9]{5}\b/)?.[0] ||
    "";
  const structuredState = getAddressPart("State");
  const initialState =
    serviceStates.find((state) =>
      structuredState
        .toLocaleLowerCase()
        .startsWith(state.toLocaleLowerCase()),
    ) ||
    (!structuredState
      ? serviceStates.find((state) =>
          initialSiteAddress
            .toLocaleLowerCase()
            .includes(state.toLocaleLowerCase()),
        )
      : "") ||
    "";
  const initialCity = getAddressPart("City") || [
    "Greater Noida", "Ghaziabad", "Faridabad", "Gurugram", "Gurgaon", "Noida", "New Delhi", "Delhi",
  ].find((city) =>
    initialSiteAddress.toLocaleLowerCase().includes(city.toLocaleLowerCase()),
  ) || "";
  const initialCustomerSummary = {
    name: revision?.customerName || initialRequest?.customerName || "",
    phone: revision?.customerPhone || initialRequest?.customerPhone || "",
    email: revision?.customerEmail || initialRequest?.customer?.email || "",
    company: initialRequest?.customer?.companyName || "",
    gstin: initialRequest?.customer?.gstin || "",
    building: getAddressPart("Building"),
    area: initialStreet,
    landmark: getAddressPart("Landmark"),
    city: initialCity,
    state: initialState,
    pincode: initialPincode,
  };
  const hasPrefilledDeliveryDetails = Boolean(
    initialCustomerSummary.name && initialCustomerSummary.phone &&
      initialCustomerSummary.area && initialCustomerSummary.city &&
      initialCustomerSummary.state && initialCustomerSummary.pincode,
  );
  const [customerDetailsEditing, setCustomerDetailsEditing] = useState(
    () => !hasPrefilledDeliveryDetails,
  );
  const [customerSummary, setCustomerSummary] = useState(initialCustomerSummary);
  function syncCustomerSummary() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    setCustomerSummary({
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      company: initialCustomerSummary.company,
      gstin: initialCustomerSummary.gstin,
      building: String(data.get("building") || ""),
      area: String(data.get("street") || ""),
      landmark: String(data.get("landmark") || ""),
      city: String(data.get("city") || ""),
      state: String(data.get("state") || ""),
      pincode: String(data.get("pincode") || ""),
    });
  }
  useEffect(() => {
    let active = true;
    request<Listing[]>("/products/catalogue")
      .then((data) => {
        if (active) setCatalogue(data);
      })
      .catch((cause) => {
        if (active) setError((cause as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request]);
  const options = useMemo<Selection[]>(
    () => [
      ...catalogue.flatMap((listing) =>
        listing.variants.length
          ? listing.variants.map((variant) => ({
              key: `variant:${variant.id}`,
              catalogueId: listing.id,
              variantId: variant.id,
              name: `${listing.name} · ${listing.brand} · ${variant.label}`,
              brand: listing.brand,
              category: listing.category,
              unit: variant.unit,
              price: variant.price || "",
            }))
          : [
              {
                key: `catalogue:${listing.id}`,
                catalogueId: listing.id,
                name: `${listing.name} · ${listing.brand}`,
                brand: listing.brand,
                category: listing.category,
                unit: listing.unit,
                price: listing.price || "",
              },
            ],
      ),
      ...inventory.map((product) => ({
        key: `inventory:${product.id}`,
        productId: product.id,
        name: `${product.name} · ${product.brand?.name || "Inventory"}`,
        brand: product.brand?.name || "Inventory",
        category: product.category,
        unit: product.unit,
        price: product.basePricePerMt,
      })),
      ...(initialRequest
        ? groupRequestedItems(initialRequest.items).map((item, index) => ({
            key: `request:${index}`,
            name: [item.material, item.brand].filter(Boolean).join(" · "),
            brand: item.brand || "",
            category: item.category || "Other materials",
            unit: item.unit,
            price: "",
            requested: true,
          }))
        : []),
    ],
    [catalogue, inventory, initialRequest],
  );
  const resolveSelection = (line: Line): Selection | undefined => {
    const matched = options.find((option) => option.key === line.selection);
    if (matched) return matched;
    if (line.selection.startsWith("custom:") && line.customName?.trim() && line.customUnit?.trim()) {
      return {
        key: line.selection,
        name: line.customName.trim(),
        brand: "Unspecified brand",
        category: line.requestedCategory || "Other materials",
        unit: line.customUnit.trim(),
        price: "",
        custom: true,
      };
    }
    return undefined;
  };
  const resolveAlternative = (line: Line, alternative: Line["alternatives"][number]): Selection | undefined => {
    const matched = options.find((option) => option.key === alternative.selection);
    if (matched) return matched;
    if (!alternative.selection.startsWith("custom:") || !alternative.customName?.trim()) return undefined;
    const primary = resolveSelection(line);
    if (!primary) return undefined;
    return {
      key: alternative.selection,
      name: alternative.customName.trim(),
      brand: alternative.customBrand?.trim() || "",
      category: primary.category || line.requestedCategory || "Other materials",
      unit: primary.unit || line.customUnit || line.requestedUnit || "",
      price: "",
      custom: true,
    };
  };
  useEffect(() => {
    if (!options.length) return;
    setLines((current) =>
      current.map((line) => {
        const currentSelection = options.find((option) => option.key === line.selection);
        const exactRequestSelection = line.requestedVariantId
          ? options.find((option) => option.key === `variant:${line.requestedVariantId}`)
          : line.requestedCatalogueId
            ? options.find((option) => option.key === `catalogue:${line.requestedCatalogueId}`)
            : undefined;
        const normalize = (value?: string | null) =>
          (value || "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        const requestedMaterial = normalize(line.requestedMaterial);
        const requestedBrand = normalize(line.requestedBrand);
        const requestedUnit = normalize(line.requestedUnit);
        const matchesByRequest = (!currentSelection || currentSelection.requested) && !exactRequestSelection && requestedMaterial
          ? options.filter((option) =>
              !option.requested &&
              normalize(option.name).includes(requestedMaterial) &&
              (!requestedBrand || normalize(option.brand) === requestedBrand) &&
              (!requestedUnit || normalize(option.unit) === requestedUnit),
            )
          : [];
        const matchedRequest = exactRequestSelection || (matchesByRequest.length === 1 ? matchesByRequest[0] : undefined);
        const requestedFallback = options.find((option) => option.key === line.requestedOptionKey);
        const selected = matchedRequest || (currentSelection && !currentSelection.requested ? currentSelection : undefined) || currentSelection || requestedFallback;
        const alternatives = line.alternatives.map((alternative) => {
          const choice = options.find((option) => option.key === alternative.selection);
          return !alternative.rate && choice?.price
            ? { ...alternative, rate: choice.price }
            : alternative;
        });
        return {
          ...line,
          ...((!currentSelection || currentSelection.requested) && selected ? { selection: selected.key } : {}),
          ...((line.selection || selected) && !line.rate && selected?.price
            ? { rate: selected.price }
            : {}),
          ...(alternatives.some((option, index) => option !== line.alternatives[index])
            ? { alternatives }
            : {}),
        };
      }),
    );
  }, [options, initialRequest]);
  const lineSubtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0),
    0,
  );
  const estimatedTax = (lineSubtotal * (Number(taxPct) || 0)) / 100;
  const estimatedTotal = lineSubtotal + (Number(freight) || 0) + estimatedTax;
  useEffect(() => {
    if (!previewOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    previewCloseRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [previewOpen]);
  useEffect(() => {
    if (!comparisonPromptOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setComparisonPromptOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [comparisonPromptOpen]);
  function update(key: string, fields: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...fields } : line)),
    );
  }
  function updateAlternative(
    lineKey: string,
    optionKey: string,
    fields: Partial<Line["alternatives"][number]>,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.key === lineKey
          ? {
              ...line,
              alternatives: line.alternatives.map((option) =>
                option.key === optionKey ? { ...option, ...fields } : option,
              ),
            }
          : line,
      ),
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (busy) return;
    const downloadAfterSave =
      (event.nativeEvent as SubmitEvent).submitter instanceof HTMLElement &&
      (event.nativeEvent as SubmitEvent).submitter?.dataset.downloadPdf === "true";
    const chosen = lines.map((line) => ({
      line,
      product: resolveSelection(line),
    }));
    if (chosen.some(({ product }) => !product)) {
      setError("Choose a catalogue item or enter a custom item and unit for every line.");
      return;
    }
    const duplicateBrand = lines.some((line) => {
      const primaryBrand = resolveSelection(line)?.brand;
      const brands = [
        primaryBrand,
        ...line.alternatives.map(
          (alternative) => resolveAlternative(line, alternative)?.brand,
        ),
      ]
        .filter(Boolean)
        .map((brand) => brand!.trim().toLocaleLowerCase());
      return new Set(brands).size !== brands.length;
    });
    if (duplicateBrand) {
      setError("Choose a different brand for each comparison option.");
      return;
    }
    if (
      lines.some((line) =>
        line.alternatives.some(
          (alternative) => {
            const comparison = resolveAlternative(line, alternative);
            return !matchesComparisonProduct(resolveSelection(line), comparison);
          },
        ),
      )
    ) {
      setError("Choose a comparison product in the same material category and unit as the requested item.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const addressParts = [
      ["Building", form.get("building")],
      ["Area", form.get("street")],
      ["Landmark", form.get("landmark")],
      ["City", form.get("city")],
      ["State", form.get("state")],
    ]
      .map(([label, value]) => {
        const text = String(value || "").trim();
        return text ? `${label}: ${text}` : "";
      })
      .filter(Boolean);
    setBusy(true);
    try {
      const savedQuote = await request<{ id: string; quoteNumber?: string }>(
        revision
          ? editing
            ? `/quotes/${revision.id}`
            : `/quotes/${revision.id}/revisions`
          : "/quotes",
        revision && editing ? "PATCH" : "POST",
        {
          requestId: revision?.requestId || initialRequest?.id || undefined,
          customerName: form.get("name"),
          customerPhone: form.get("phone"),
          customerEmail: form.get("email") || undefined,
          drawingFileUrl: revision?.drawingFileUrl || undefined,
          projectSiteAddress: addressParts.join(", "),
          sitePincode: form.get("pincode"),
          notes: form.get("notes") || undefined,
          freightAmount: Number(form.get("freight")),
          taxPct: Number(form.get("tax")),
          items: chosen.map(({ line, product }) => ({
            productId: product?.productId,
            catalogueId: product?.catalogueId,
            variantId: product?.variantId,
            ...(product?.requested
              ? {
                  productName: line.customName || line.requestedMaterial || product.name,
                  brandName: line.requestedBrand || product.brand,
                  categoryName: line.requestedCategory || product.category || "Other materials",
                  unit: line.customUnit || line.requestedUnit || product.unit,
                }
              : product?.custom
                ? {
                    productName: line.customName || product.name,
                    brandName: product.brand,
                    categoryName: product.category || "Other materials",
                    unit: line.customUnit || product.unit,
                  }
                : {}),
            quantity: Number(line.quantity),
            unitPrice: Number(line.rate),
            specification: line.specification,
            alternatives: line.alternatives.map((alternative) => {
              const option = resolveAlternative(line, alternative)!;
              return {
                ...(option.custom
                  ? {
                      productName: option.name,
                      brandName: option.brand,
                      categoryName: option.category || "Other materials",
                      unit: option.unit,
                    }
                  : {
                      productId: option.productId,
                      catalogueId: option.catalogueId,
                      variantId: option.variantId,
                    }),
                quantity: Number(alternative.quantity),
                unitPrice: Number(alternative.rate),
                specification: alternative.specification,
              };
            }),
          })),
        },
      );
      if (downloadAfterSave && savedQuote?.id && downloadPdf) {
        await downloadPdf(
          `/quotes/${savedQuote.id}/pdf`,
          `Quotation-${savedQuote.quoteNumber || savedQuote.id}.pdf`,
        );
      }
      await onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="sales-quote-editor-shell">
      <button type="button" className="sales-quote-back admin-back-button" onClick={onCancel}>
        <ArrowLeft size={16} aria-hidden="true" /> Back to quotations
      </button>
    <section className="panel-card panel-body sales-quote-composer">
      <header className="sales-quote-composer-header">
        <div>
          <span className="sales-section-eyebrow">QUOTE WORKSPACE</span>
          <h2>
            {customQuotation
              ? "Create custom quotation"
              : revision
              ? editing
                ? "Edit quotation draft"
                : "Revise quotation"
              : "Prepare quotation"}
          </h2>
          <p>{customQuotation
            ? "Build an offer from a WhatsApp message, email, drawing, or another customer brief. Add the customer’s items and rates line by line."
            : "Set your item rates, add an optional brand comparison, and review the total."}</p>
        </div>
        <span className="sales-quote-draft-badge">{revision ? "DRAFT EDITOR" : "NEW DRAFT"}</span>
      </header>
      {(initialRequest || revision?.requestId) && (
        <p className="sales-source-request-note" role="status">
          <span>FROM CUSTOMER REQUEST</span>
          {(initialRequest?.requestNumber || linkedRequestNumber) && (
            <strong>{initialRequest?.requestNumber || linkedRequestNumber}</strong>
          )}
          <span>The customer will see this quotation after it is published.</span>
        </p>
      )}
      {revision && (
        <p className="sales-quote-revision-hint">
          Saving recalculates the draft totals. A published quotation is updated as a new revision.
        </p>
      )}
      {loading && <p role="status">Loading quotation catalogue…</p>}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <form ref={formRef} className="operation-form" onSubmit={save}>
        <fieldset disabled={busy || loading} className="quote-editor-fields">
          <section ref={customerSectionRef} className="sales-quote-section">
            <div className="sales-quote-section-heading sales-quote-customer-section-heading">
              <span className="sales-quote-section-step">01</span>
              <div><h3>Customer & delivery site</h3><p>Confirm who the quotation is for and where materials should go.</p></div>
              <button
                type="button"
                className="sales-quote-customer-edit-toggle"
                aria-expanded={customerDetailsEditing}
                onClick={() => {
                  if (customerDetailsEditing) syncCustomerSummary();
                  setCustomerDetailsEditing((currentlyEditing) => !currentlyEditing);
                  if (!customerDetailsEditing) {
                    window.setTimeout(() => formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true }), 50);
                  }
                }}
              >{customerDetailsEditing ? "Done editing" : "Edit details"}</button>
            </div>
          {!customerDetailsEditing && (
            <div className="sales-quote-customer-summary">
              <div className="sales-quote-customer-summary-grid">
                <div><span>Name</span><strong>{customerSummary.name || "Not provided"}</strong></div>
                <div><span>Mobile</span><strong>{customerSummary.phone || "Not provided"}</strong></div>
                <div><span>Company</span><strong>{customerSummary.company || "Not provided"}</strong></div>
                <div><span>GSTIN</span><strong>{customerSummary.gstin || "Not provided"}</strong></div>
                <div><span>Email</span><strong>{customerSummary.email || "Not provided"}</strong></div>
              </div>
              <div className="sales-quote-customer-summary-address">
                <span>Delivery address</span>
                <dl>
                  {([ ["Building", customerSummary.building], ["Area", customerSummary.area], ["Landmark", customerSummary.landmark], ["City", customerSummary.city], ["State", customerSummary.state], ["PIN code", customerSummary.pincode] ] as const)
                    .map(([label, value]) => value ? <div key={label}><dt>{label}</dt><dd>{value}</dd></div> : null)}
                  {!customerSummary.building && !customerSummary.area && !customerSummary.landmark && !customerSummary.city && !customerSummary.state && !customerSummary.pincode && <div><dt>Address</dt><dd>Not provided</dd></div>}
                </dl>
              </div>
            </div>
          )}
          <div className="quote-customer-details" hidden={!customerDetailsEditing} onInput={syncCustomerSummary}>
            <label>
              Customer name
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={
                  revision?.customerName || initialRequest?.customerName
                }
              />
            </label>
            <label>
              Mobile number
              <input
                name="phone"
                required
                pattern="[6-9][0-9]{9}"
                readOnly={Boolean(revision)}
                defaultValue={
                  revision?.customerPhone || initialRequest?.customerPhone
                }
              />
            </label>
            <label>
              Customer email
              <input
                name="email"
                type="email"
                maxLength={254}
                defaultValue={revision?.customerEmail || initialRequest?.customer?.email || ""}
              />
            </label>
            <label>
              PIN code
              <input
                name="pincode"
                required
                pattern="[1-9][0-9]{5}"
                placeholder="6 digit PIN code"
                defaultValue={initialPincode}
              />
            </label>
            <label className="quote-field-address">
              Flat, house no., building, company or apartment
              <input
                name="building"
                maxLength={250}
                placeholder="Flat, house number, building or apartment"
                defaultValue={getAddressPart("Building")}
              />
            </label>
            <label className="quote-field-address">
              Area, street, sector or village
              <input
                name="street"
                required
                minLength={5}
                maxLength={500}
                placeholder="Enter the area, street, sector or village"
                defaultValue={initialStreet}
              />
            </label>
            <label>
              Landmark
              <input
                name="landmark"
                maxLength={200}
                placeholder="Nearby landmark (optional)"
                defaultValue={getAddressPart("Landmark")}
              />
            </label>
            <label>
              Town / City
              <input
                name="city"
                required
                maxLength={100}
                placeholder="City"
                defaultValue={initialCity}
              />
            </label>
            <label>
              State
              <select name="state" required defaultValue={initialState}>
                <option value="">Choose a state</option>
                {serviceStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </label>
          </div>
          </section>
          <section ref={itemsSectionRef} className={`sales-quote-section${comparisonMode ? " sales-quote-comparison-mode" : ""}`}>
            <div className="sales-quote-section-heading">
              <span className="sales-quote-section-step">02</span>
              <div><h3>{comparisonMode ? "Compare quotation options" : "Quotation items"}</h3><p>{comparisonMode ? "Your current quotation is kept as the first option. Add alternative brands to any line, then preview one comparison PDF." : "Customer items are selected by default. Choose an inventory match or type a custom item; suggestions appear as you type."}</p></div>
              <span className="sales-quote-item-count">{lines.length} {lines.length === 1 ? "line" : "lines"}</span>
            </div>
          <div className="sales-quote-sheet-scroll">
          <table className="sales-quote-sheet-table">
            <thead>
              <tr><th scope="col">Item / brand</th><th scope="col">Qty</th><th scope="col">Unit rate</th><th scope="col">Specification</th><th scope="col">Amount</th><th scope="col"><span className="sales-quote-sr-only">Row actions</span></th></tr>
            </thead>
            {lines.map((line, index) => {
      const selected = resolveSelection(line);
            const itemSuggestions = suggestionQuery.trim().length >= 2
              ? options.filter((option) =>
                  !option.requested &&
                  `${option.name} ${option.brand} ${option.unit}`
                    .toLocaleLowerCase()
                    .includes(suggestionQuery.trim().toLocaleLowerCase()),
                ).slice(0, 8)
              : [];
            const comparisonOptions = options.filter((option) =>
              !option.requested && matchesComparisonProduct(selected, option),
            );
            return (
              <tbody className="sales-quote-sheet-line" key={line.key}>
                <tr>
                  <td>
                    <div className="sales-quote-sheet-item-label">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {line.requestedSummary && <small>Customer asked for: {line.requestedSummary}</small>}
                    </div>
                    <div className="sales-quote-product-autocomplete">
                      <input
                        aria-label={`Product or pack for item ${index + 1}`}
                        autoComplete="off"
                        required
                        maxLength={200}
                        placeholder="Choose from inventory or type an item"
                        value={selected?.name || line.customName || ""}
                        onFocus={() => {
                          setSuggestingLineKey(line.key);
                          setSuggestionQuery("");
                        }}
                        onBlur={() => window.setTimeout(() => setSuggestingLineKey((active) => active === line.key ? null : active), 120)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setSuggestionQuery(value);
                          const normalizedValue = value.trim().toLocaleLowerCase();
                          const match = options.find(
                            (option) => option.name.trim().toLocaleLowerCase() === normalizedValue,
                          );
                          if (match) {
                            update(line.key, {
                              selection: match.key,
                              customName: undefined,
                              customUnit: undefined,
                              rate: match.price || "",
                            });
                          } else {
                            update(line.key, {
                              selection: value.trim() ? `custom:${line.key}` : "",
                              customName: value,
                              customUnit: line.customUnit || line.requestedUnit || selected?.unit || "",
                              rate: line.selection.startsWith("custom:") ? line.rate : "",
                            });
                          }
                        }}
                      />
                      {suggestingLineKey === line.key && suggestionQuery.trim().length >= 2 && (
                        <div className="sales-quote-product-suggestions" role="listbox" aria-label={`Product suggestions for item ${index + 1}`}>
                          {itemSuggestions.length ? itemSuggestions.map((option) => (
                            <button
                              type="button"
                              role="option"
                              aria-selected="false"
                              className="sales-quote-product-suggestion"
                              key={option.key}
                              onPointerDown={(event) => event.preventDefault()}
                              onClick={() => {
                                update(line.key, {
                                  selection: option.key,
                                  customName: undefined,
                                  customUnit: undefined,
                                  rate: option.price || "",
                                });
                                setSuggestingLineKey(null);
                                setSuggestionQuery("");
                              }}
                            >
                              <span>{option.name}</span>
                              <small>{option.unit}{option.price ? ` · ${formatMoney(Number(option.price))}` : ""}</small>
                            </button>
                          )) : (
                            <div className="sales-quote-product-no-suggestions">No catalogue match. Your typed item will be used.</div>
                          )}
                        </div>
                      )}
                    </div>
                    {line.selection.startsWith("custom:") && (
                      <label className="sales-quote-custom-unit">
                        Unit
                        <input
                          aria-label={`Unit for custom item ${index + 1}`}
                          required
                          maxLength={100}
                          placeholder="e.g. bag, litre, piece"
                          value={line.customUnit || ""}
                          onChange={(event) => update(line.key, { customUnit: event.target.value })}
                        />
                      </label>
                    )}
                  </td>
                  <td>
                    <input
                    aria-label={`Quantity for item ${index + 1}${selected ? ` in ${selected.unit}` : ""}`}
                    type="number"
                    required
                    min="0.001"
                    max="1000000"
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) =>
                      update(line.key, { quantity: event.target.value })
                    }
                  />
                  </td>
                  <td>
                    <input
                    aria-label={`Unit rate for item ${index + 1}${selected ? ` per ${selected.unit}` : ""}`}
                    type="number"
                    required
                    min="0"
                    max="99999999"
                    step="0.01"
                    value={line.rate}
                    onChange={(event) =>
                      update(line.key, { rate: event.target.value })
                    }
                  />
                  </td>
                  <td>
                    <input
                    aria-label={`Specification for item ${index + 1}`}
                    maxLength={500}
                    value={line.specification}
                    onChange={(event) =>
                      update(line.key, { specification: event.target.value })
                    }
                  />
                  </td>
                  <td className="sales-quote-sheet-amount">{formatMoney((Number(line.quantity) || 0) * (Number(line.rate) || 0))}</td>
                  <td className="sales-quote-sheet-actions">
                    {lines.length > 1 && <button type="button" className="sales-quote-remove-line" aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}>Remove</button>}
                  </td>
                </tr>
                {comparisonMode && line.alternatives.map((alternative, optionIndex) => {
                  const selectedOption = resolveAlternative(line, alternative);
                  const alternativeSuggestions = alternativeSuggestionQuery.trim().length >= 2
                    ? comparisonOptions.filter((option) =>
                        `${option.name} ${option.brand} ${option.unit}`
                          .toLocaleLowerCase()
                          .includes(alternativeSuggestionQuery.trim().toLocaleLowerCase()),
                      ).slice(0, 8)
                    : [];
                  return (
                    <tr className="sales-quote-comparison-row" key={alternative.key}>
                      <td>
                        <small>Compare option {optionIndex + 1}</small>
                        <div className="sales-quote-product-autocomplete">
                          <input
                            aria-label={`Comparison product for item ${index + 1}, option ${optionIndex + 1}`}
                            autoComplete="off"
                            required
                            maxLength={200}
                            placeholder="Type a product or brand"
                            value={selectedOption?.custom ? alternative.customName || "" : selectedOption?.name || alternative.customName || ""}
                            onFocus={() => {
                              setSuggestingAlternativeKey(alternative.key);
                              setAlternativeSuggestionQuery("");
                            }}
                            onBlur={() => window.setTimeout(() => setSuggestingAlternativeKey((active) => active === alternative.key ? null : active), 120)}
                            onChange={(event) => {
                              const value = event.target.value;
                              setAlternativeSuggestionQuery(value);
                              const normalized = value.trim().toLocaleLowerCase();
                              const match = comparisonOptions.find((option) => option.name.trim().toLocaleLowerCase() === normalized);
                              updateAlternative(line.key, alternative.key, match
                                ? { selection: match.key, customName: undefined, customBrand: undefined, rate: match.price || "" }
                                : { selection: value.trim() ? `custom:${alternative.key}` : "", customName: value, rate: alternative.selection.startsWith("custom:") ? alternative.rate : "" });
                            }}
                          />
                          {suggestingAlternativeKey === alternative.key && alternativeSuggestionQuery.trim().length >= 2 && (
                            <div className="sales-quote-product-suggestions" role="listbox" aria-label={`Comparison suggestions for item ${index + 1}`}>
                              {alternativeSuggestions.length ? alternativeSuggestions.map((option) => (
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected="false"
                                  className="sales-quote-product-suggestion"
                                  key={option.key}
                                  onPointerDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    updateAlternative(line.key, alternative.key, { selection: option.key, customName: undefined, customBrand: undefined, rate: option.price || "" });
                                    setSuggestingAlternativeKey(null);
                                    setAlternativeSuggestionQuery("");
                                  }}
                                >
                                  <span>{option.name}</span>
                                  <small>{option.unit}{option.price ? ` · ${formatMoney(Number(option.price))}` : ""}</small>
                                </button>
                              )) : (
                                <div className="sales-quote-product-no-suggestions">No catalogue match. Your typed item will be used.</div>
                              )}
                            </div>
                          )}
                        </div>
                        {alternative.selection.startsWith("custom:") && (
                          <label className="sales-quote-custom-unit">
                            Brand
                            <input
                              aria-label={`Brand for comparison option ${optionIndex + 1} on item ${index + 1}`}
                              maxLength={120}
                              placeholder="Enter brand"
                              value={alternative.customBrand || ""}
                              onChange={(event) => updateAlternative(line.key, alternative.key, { customBrand: event.target.value })}
                            />
                          </label>
                        )}
                      </td>
                      <td>
                        <input
                          aria-label={`Quantity for comparison option ${optionIndex + 1} on item ${index + 1} in ${selectedOption?.unit || selected?.unit || "unit"}`}
                          type="number"
                          required
                          min="0.001"
                          max="1000000"
                          step="0.001"
                          value={alternative.quantity}
                          onChange={(event) => updateAlternative(line.key, alternative.key, { quantity: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Comparison unit rate for item ${index + 1}, option ${optionIndex + 1}`}
                          type="number"
                          required
                          min="0"
                          max="99999999"
                          step="0.01"
                          value={alternative.rate}
                          onChange={(event) =>
                            updateAlternative(line.key, alternative.key, {
                              rate: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Comparison specification for item ${index + 1}, option ${optionIndex + 1}`}
                          maxLength={500}
                          value={alternative.specification}
                          onChange={(event) =>
                            updateAlternative(line.key, alternative.key, {
                              specification: event.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="sales-quote-sheet-amount">{formatMoney((Number(alternative.quantity) || 0) * (Number(alternative.rate) || 0))}</td>
                      <td className="sales-quote-sheet-actions">
                        <button type="button" className="sales-quote-remove-line" aria-label={`Remove comparison option ${optionIndex + 1}`} onClick={() =>
                          update(line.key, {
                            alternatives: line.alternatives.filter(
                              (option) => option.key !== alternative.key,
                            ),
                          })
                        }>Remove</button>
                      </td>
                    </tr>
                  );
                })}
                {comparisonMode && <tr className="sales-quote-sheet-footer"><td colSpan={6}>
                  <button
                    type="button"
                    className="btn-sm btn-secondary"
                    disabled={line.alternatives.length >= 10}
                    onClick={() =>
                      update(line.key, {
                        alternatives: [
                          ...line.alternatives,
                          {
                            key: crypto.randomUUID(),
                            selection: "",
                            quantity: line.quantity,
                            rate: "",
                            specification: "",
                          },
                        ],
                      })
                    }
                  >
                    {line.alternatives.length ? "＋ Add another option" : "＋ Compare another brand"}
                  </button>
                </td></tr>}
              </tbody>
            );
          })}
          </table>
          </div>
          <button
            type="button"
            className="btn-sm btn-secondary"
            disabled={lines.length >= 100}
            onClick={() => setLines((current) => [...current, blank()])}
          >
            + Add another item
          </button>
          </section>
          <section className="sales-quote-section sales-quote-pricing-section">
            <div className="sales-quote-section-heading">
              <span className="sales-quote-section-step">03</span>
              <div><h3>Pricing & notes</h3><p>Enter delivery freight and the applicable tax rate. Quotation validity is assigned automatically.</p></div>
            </div>
            <div className="sales-quote-pricing-grid">
              <div className="sales-quote-pricing-fields">
          <label>
            Freight / delivery charges
            <input
              name="freight"
              type="number"
              min="0"
              step="0.01"
              value={freight}
              onChange={(event) => setFreight(event.target.value)}
              required
            />
            <small>Confirmed delivery charge for this site.</small>
          </label>
          <label>
            Tax rate (%)
            <input
              name="tax"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={taxPct}
              onChange={(event) => setTaxPct(event.target.value)}
              required
            />
            <small>Tax is calculated using one rate for the quotation.</small>
          </label>
          <label>
            Quotation notes
            <textarea
              name="notes"
              maxLength={5000}
              defaultValue={revision?.notes || ""}
            />
          </label>
              </div>
              <aside className="sales-quote-total-card" aria-live="polite">
                <span className="sales-quote-total-eyebrow">LIVE ESTIMATE</span>
                <div><span>Items subtotal</span><strong>{formatMoney(lineSubtotal)}</strong></div>
                <div><span>Freight</span><strong>{formatMoney(Number(freight) || 0)}</strong></div>
                <div><span>Tax · {Number(taxPct) || 0}%</span><strong>{formatMoney(estimatedTax)}</strong></div>
                <div className="sales-quote-estimated-total"><span>Estimated total</span><strong>{formatMoney(estimatedTotal)}</strong></div>
                <small>Estimate before automatic discounts. Final totals are calculated when you save.</small>
              </aside>
            </div>
          </section>
          <div className="sales-quote-actions">
            {!customQuotation && (
              comparisonMode ? (
                <span className="sales-quote-comparison-active">Comparison quotation</span>
              ) : (
                <button
                  type="button"
                  className="btn-sm btn-secondary sales-quote-comparison-start"
                  onClick={() => setComparisonPromptOpen(true)}
                >＋ Compare another brand</button>
              )
            )}
            <button
              type="button"
              className="btn-sm btn-secondary sales-quote-preview-toggle"
              ref={previewTriggerRef}
              aria-expanded={previewOpen}
              aria-controls="sales-quotation-preview-dialog"
              onClick={() => {
              if (!formRef.current) return;
              if (lines.some((line) => line.alternatives.some((alternative) => {
                const option = resolveAlternative(line, alternative);
                return !matchesComparisonProduct(resolveSelection(line), option);
              }))) {
                setError("Choose a comparison product in the same material category and unit as the requested item.");
                itemsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              const form = new FormData(formRef.current);
              const items = lines.map((line) => {
                const product = resolveSelection(line);
                return {
                  name: product?.name || line.customName || "Choose a product / pack",
                  specification: line.specification,
                  quantity: Number(line.quantity) || 0,
                  unit: line.customUnit || product?.unit || "",
                  rate: Number(line.rate) || 0,
                  alternatives: line.alternatives.flatMap((alternative) => {
                    const option = resolveAlternative(line, alternative);
                    if (!option) return [];
                    return [{
                      name: option.custom ? [option.name, option.brand].filter(Boolean).join(" · ") : option.name,
                      specification: alternative.specification,
                      quantity: Number(alternative.quantity) || 0,
                      unit: option.unit,
                      rate: Number(alternative.rate) || 0,
                    }];
                  }),
                };
              });
              const siteAddress = ["building", "street", "landmark", "city", "state", "pincode"]
                .map((name) => String(form.get(name) || "").trim())
                .filter(Boolean)
                .join(", ");
              setPreviewSnapshot({
                requestNumber: initialRequest?.requestNumber || linkedRequestNumber || "",
                customerName: String(form.get("name") || "").trim(),
                customerPhone: String(form.get("phone") || "").trim(),
                customerEmail: String(form.get("email") || "").trim(),
                companyName: initialRequest?.customer?.companyName?.trim() || "",
                gstin: initialRequest?.customer?.gstin?.trim() || "",
                siteAddress,
                addressFields: [
                  ["Building", "building"],
                  ["Area", "street"],
                  ["Landmark", "landmark"],
                  ["City", "city"],
                  ["State", "state"],
                  ["PIN code", "pincode"],
                ].map(([label, name]) => ({
                  label,
                  value: String(form.get(name) || "").trim(),
                })).filter((field) => field.value),
                notes: String(form.get("notes") || "").trim(),
                freight: Number(form.get("freight")) || 0,
                taxPct: Number(form.get("tax")) || 0,
                subtotal: items.reduce((sum, item) => sum + item.quantity * item.rate, 0),
                taxEstimate: (items.reduce((sum, item) => sum + item.quantity * item.rate, 0) * (Number(form.get("tax")) || 0)) / 100,
                estimatedTotal: items.reduce((sum, item) => sum + item.quantity * item.rate, 0) + (Number(form.get("freight")) || 0) + ((items.reduce((sum, item) => sum + item.quantity * item.rate, 0) * (Number(form.get("tax")) || 0)) / 100),
                items,
              });
                setPreviewOpen(true);
              }}
            >
              Preview customer PDF
            </button>
            {customQuotation && (
              <button
                type="submit"
                className="btn-sm btn-secondary"
                data-download-pdf="true"
                disabled={!options.length}
              >
                <Download size={15} aria-hidden="true" />
                {busy ? "Saving & downloading…" : "Save & download PDF"}
              </button>
            )}
            <button className="btn-sm btn-primary" disabled={!options.length}>
              {busy ? "Saving draft…" : "Save quotation draft"}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
    {comparisonPromptOpen && createPortal(
      <div className="sales-quote-confirm-overlay" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setComparisonPromptOpen(false);
      }}>
        <section className="sales-quote-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="sales-quote-comparison-confirm-title">
          <span className="sales-section-eyebrow">QUOTATION COMPARISON</span>
          <h2 id="sales-quote-comparison-confirm-title">Prepare a comparison quotation?</h2>
          <p>Your current quotation and customer-requested items will stay as the first option. You can add other brands or custom products line by line, then preview and save one comparison PDF.</p>
          <div className="sales-quote-confirm-actions">
            <button type="button" className="btn-sm btn-secondary" onClick={() => setComparisonPromptOpen(false)}>Keep this quotation</button>
            <button type="button" className="btn-sm btn-primary" onClick={() => {
              setComparisonPromptOpen(false);
              setComparisonMode(true);
              window.setTimeout(() => itemsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
            }}>Continue to comparison</button>
          </div>
        </section>
      </div>,
      document.body,
    )}
    {previewOpen && previewSnapshot && createPortal(
      <div
        className="sales-quote-preview-overlay"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPreviewOpen(false);
        }}
      >
        <section
          id="sales-quotation-preview-dialog"
          className="sales-quote-preview-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sales-quotation-preview-title"
        >
          <header className="sales-quote-preview-toolbar">
            <div>
              <span>DRAFT · NOT SENT</span>
              <h2 id="sales-quotation-preview-title">{comparisonMode ? "Customer quotation comparison preview" : "Customer quotation preview"}</h2>
              <p>{comparisonMode ? "Review the requested items and the alternative brands in the comparison PDF." : "Review the PDF-style document the customer will receive."}</p>
            </div>
            <button ref={previewCloseRef} type="button" aria-label="Close quotation preview" onClick={() => setPreviewOpen(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </header>
          <div className="sales-quote-preview-scroll">
            <article className="sales-quote-preview-paper">
              <div className="sales-quote-preview-brandbar" />
              <header className="sales-quote-preview-document-heading">
                <MaterialSquareLogo
                  size={58}
                  showText
                  lightMode={false}
                  tagline="BUILDING BETTER TOGETHER"
                  className="sales-quote-preview-logo"
                />
                <div className="sales-quote-preview-document-title">
                  <span>QUOTATION</span>
                  <strong>{previewSnapshot.requestNumber || "Draft quotation"}</strong>
                  <small>Draft preview · Not sent</small>
                </div>
              </header>
              <section className="sales-quote-preview-customer">
                <div className="sales-quote-preview-section-title">CUSTOMER INFORMATION</div>
                <div className="sales-quote-preview-customer-grid">
                  <div><span>Name</span><strong>{previewSnapshot.customerName || "Not provided"}</strong></div>
                  <div><span>Mobile</span><strong>{previewSnapshot.customerPhone || "Not provided"}</strong></div>
                  <div><span>Company</span><strong>{previewSnapshot.companyName || "Not provided"}</strong></div>
                  <div><span>GSTIN</span><strong>{previewSnapshot.gstin || "Not provided"}</strong></div>
                  {previewSnapshot.customerEmail && <div><span>Email</span><strong>{previewSnapshot.customerEmail}</strong></div>}
                </div>
                <div className="sales-quote-preview-address">
                  <span>Delivery address</span>
                  {previewSnapshot.addressFields.length ? (
                    <dl>{previewSnapshot.addressFields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>
                  ) : <strong>Not provided</strong>}
                </div>
              </section>
              <section className="sales-quote-preview-lines">
                <div className="sales-quote-preview-section-title">QUOTED ITEMS</div>
                <div className="sales-quote-preview-table-wrap">
                  <table>
                    <thead><tr><th>Item</th><th>Qty</th><th>Unit rate</th><th>Amount</th></tr></thead>
                    <tbody>{previewSnapshot.items.flatMap((item, index) => [
                      <tr key={`${item.name}-${index}`}>
                        <td><strong>{item.name}</strong>{item.specification && <small>{item.specification}</small>}</td>
                        <td>{item.quantity} × {item.unit}</td>
                        <td>{formatMoney(item.rate)}</td>
                        <td>{formatMoney(item.quantity * item.rate)}</td>
                      </tr>,
                      ...item.alternatives.map((alternative, optionIndex) => (
                        <tr className="sales-quote-preview-alternative-row" key={`${item.name}-${index}-option-${optionIndex}`}>
                          <td><strong>Option {String.fromCharCode(66 + optionIndex)} · {alternative.name}</strong>{alternative.specification && <small>{alternative.specification}</small>}</td>
                          <td>{alternative.quantity} × {alternative.unit}</td>
                          <td>{formatMoney(alternative.rate)}</td>
                          <td>{formatMoney(alternative.quantity * alternative.rate)}</td>
                        </tr>
                      )),
                    ])}</tbody>
                  </table>
                </div>
              </section>
              {previewSnapshot.notes && <section className="sales-quote-preview-notes"><strong>Notes</strong><p>{previewSnapshot.notes}</p></section>}
              <section className="sales-quote-preview-totals">
                <dl>
                  <div><dt>Items subtotal</dt><dd>{formatMoney(previewSnapshot.subtotal)}</dd></div>
                  <div><dt>Delivery / freight</dt><dd>{formatMoney(previewSnapshot.freight)}</dd></div>
                  <div><dt>Tax estimate ({previewSnapshot.taxPct}%)</dt><dd>{formatMoney(previewSnapshot.taxEstimate)}</dd></div>
                  <div className="sales-quote-preview-grand-total"><dt>Estimated total</dt><dd>{formatMoney(previewSnapshot.estimatedTotal)}</dd></div>
                </dl>
                <p>Final discounts, margin and totals are calculated when this draft is saved.</p>
              </section>
              <footer className="sales-quote-preview-document-footer">Material Square · This quotation is a private draft preview and has not been sent.</footer>
            </article>
          </div>
        </section>
      </div>,
      document.body,
    )}
    </div>
  );
}
