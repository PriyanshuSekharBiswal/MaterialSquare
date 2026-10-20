import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { normalizeCatalogueCategory, resolveCatalogueCategoryId, STOREFRONT_CATEGORIES, type ManagedCatalogueCategory } from "@material-square/types";
import { confirmAdminAction } from "../../components/confirmAdminAction";

export type DiscountRule = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  createdBy?: string | null;
  updatedAt: string;
  categories?: string[] | null;
  category?: string | null;
  deliveryPincodes: string[];
  percentageOff: string | number;
  fixedAmountOff: string | number;
  isActive: boolean;
  minimumQuantity?: string | number | null;
  maximumQuantity?: string | number | null;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
};
type Props = {
  rules: DiscountRule[];
  busy: boolean;
  loadingRecords: boolean;
  submit: (
    event: FormEvent<HTMLFormElement>,
    body: (data: FormData) => unknown,
    url?: string,
    method?: string,
  ) => Promise<unknown>;
  mutate: (url: string, method: string, body: unknown) => Promise<unknown>;
};
const field = (data: FormData, key: string) =>
  String(data.get(key) || "").trim();

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function DiscountCategoryField({ value }: { value: string[] }) {
  const [selected, setSelected] = useState(value);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<ManagedCatalogueCategory[]>(() =>
    STOREFRONT_CATEGORIES.map(({ id, label }) => ({ id, label, active: true, aliases: [] })),
  );
  const suggestionsId = useId();
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || "/api"}/products/categories`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<ManagedCatalogueCategory[]> : null)
      .then((result) => {
        if (result && !controller.signal.aborted) setCategories(result.filter((category) => category.active));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const categoryOptions = [...new Map(categories
    .filter((category) => category.active && category.label.trim())
    .map((category) => [category.id || normalizeCatalogueCategory(category.label), category]))
    .values()].sort((a, b) => a.label.localeCompare(b.label));
  const selectedForOption = (option: ManagedCatalogueCategory) => selected.some((item) =>
    resolveCatalogueCategoryId(item, categories) === (option.id || normalizeCatalogueCategory(option.label)),
  );
  const selectedLabels = selected.map((item) => {
    const match = categoryOptions.find((option) => resolveCatalogueCategoryId(item, categories) === (option.id || normalizeCatalogueCategory(option.label)));
    return match?.label || item;
  });
  const customSelections = selected.filter((item) => !categoryOptions.some((option) =>
    resolveCatalogueCategoryId(item, categories) === (option.id || normalizeCatalogueCategory(option.label)),
  ));

  return (
    <div className="discount-category-entry" ref={fieldRef}>
      {[...new Set(selectedLabels)].map((label) => (
        <input key={label} type="hidden" name="categories" value={label} />
      ))}
      <button
        type="button"
        className="discount-category-trigger"
        aria-label="Choose discount categories"
        aria-controls={suggestionsId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selectedLabels.length ? selectedLabels.join(", ") : "Choose one or more categories"}</span>
        <b aria-hidden="true" />
      </button>
      {open && (
        <div id={suggestionsId} className="discount-category-options supplier-multiselect-options" role="group" aria-label="Discount categories">
          {customSelections.map((category) => (
            <label className="supplier-multiselect-option" key={category}>
              <input
                type="checkbox"
                value={category}
                checked
                onChange={() => setSelected((current) => current.filter((item) => item !== category))}
              />
              <span>{category}</span>
            </label>
          ))}
          {categoryOptions.map((category) => (
            <label className="supplier-multiselect-option" key={category.id || category.label}>
              <input
                type="checkbox"
                value={category.label}
                checked={selectedForOption(category)}
                onChange={() => setSelected((current) => selectedForOption(category)
                  ? current.filter((item) => resolveCatalogueCategoryId(item, categories) !== (category.id || normalizeCatalogueCategory(category.label)))
                  : [...current, category.label])}
              />
              <span>{category.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscountRules({ rules, busy, loadingRecords, submit, mutate }: Props) {
  const [editing, setEditing] = useState<DiscountRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const showForm = Boolean(editing || creating);
  useEffect(() => {
    if (showForm) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showForm, editing, formVersion]);
  const backToList = () => {
    setEditing(null);
    setCreating(false);
    if (editing) setFormVersion((value) => value + 1);
  };
  const blankOptional = editing ? null : undefined;
  return (
    <>
      <form
        ref={formRef}
        key={`${editing?.id || "new"}-${formVersion}`}
        className="bc-form discount-rule-form"
        hidden={!showForm}
        autoComplete="off"
        onSubmit={async (e) => {
          const saved = await submit(
            e,
            (f) => ({
              name: field(f, "ruleName"),
              description: field(f, "description") || blankOptional,
              expectedUpdatedAt: editing?.updatedAt,
              category: blankOptional,
              categories: f.getAll("categories").map((value) => String(value)),
              deliveryPincodes: field(f, "pincodes")
                .split(/[ ,]+/)
                .filter(Boolean),
              minimumQuantity: f.get("minimum")
                ? Number(f.get("minimum"))
                : blankOptional,
              maximumQuantity: f.get("maximum")
                ? Number(f.get("maximum"))
                : blankOptional,
              startsAt: f.get("startsAt")
                ? new Date(String(f.get("startsAt"))).toISOString()
                : blankOptional,
              endsAt: f.get("endsAt")
                ? new Date(String(f.get("endsAt"))).toISOString()
                : blankOptional,
              percentageOff: Number(f.get("percentage")),
              fixedAmountOff: Number(f.get("fixed")),
              priority: Number(f.get("priority")),
              isActive: f.get("active") === "on",
            }),
            editing ? `/discount-rules/${editing.id}` : "/discount-rules",
            editing ? "PATCH" : "POST",
          );
          if (saved) {
            setEditing(null);
            setCreating(false);
            setFormVersion((value) => value + 1);
          }
        }}
      >
        <div className="discount-rule-form-heading">
          <button type="button" className="bc-button" disabled={busy} onClick={backToList}>
            <ArrowLeft size={15} aria-hidden="true" /> Back to discount rules
          </button>
          <h2>
            {editing
              ? `Edit ${editing.name}`
              : "Configure an automatic quote discount"}
          </h2>
        </div>
        <div className="bc-fields">
          <label>
            Rule name
            <input name="ruleName" autoComplete="off" required defaultValue={editing?.name || ""} />
          </label>
          <label>
            Category (optional)
            <DiscountCategoryField value={editing?.categories?.length ? editing.categories : editing?.category ? [editing.category] : []} />
            <span className="discount-category-help">Leave blank to apply this rule to all categories.</span>
          </label>
          <label>
            Delivery PIN codes
            <input
              name="pincodes"
              defaultValue={editing?.deliveryPincodes.join(", ") || ""}
              placeholder="Enter PIN codes separated by commas"
            />
            <span className="discount-pincodes-help">
              Example: 201301, 201310. Leave blank to apply to all service areas.
            </span>
          </label>
          <label className="bc-wide">
            Rule description (optional)
            <textarea
              name="description"
              maxLength={1000}
              defaultValue={editing?.description || ""}
            />
          </label>
          <label>
            Minimum quantity
            <input
              name="minimum"
              defaultValue={editing?.minimumQuantity ?? ""}
              type="number"
              min="0.001"
              step="0.001"
            />
          </label>
          <label>
            Maximum quantity
            <input
              name="maximum"
              defaultValue={editing?.maximumQuantity ?? ""}
              type="number"
              min="0.001"
              step="0.001"
            />
          </label>
          <label>
            Starts at (optional)
            <input
              name="startsAt"
              defaultValue={localDateTime(editing?.startsAt)}
              type="datetime-local"
            />
          </label>
          <label>
            Ends at (optional)
            <input
              name="endsAt"
              defaultValue={localDateTime(editing?.endsAt)}
              type="datetime-local"
            />
          </label>
          <label>
            Discount percent
            <input
              name="percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={editing?.percentageOff ?? 0}
            />
          </label>
          <label>
            Fixed discount per item (₹)
            <input
              name="fixed"
              type="number"
              min="0"
              step="0.01"
              defaultValue={editing?.fixedAmountOff ?? 0}
            />
          </label>
          <label>
            Priority
            <input
              name="priority"
              type="number"
              min="0"
              defaultValue={editing?.priority ?? 0}
            />
          </label>
          <label className="bc-check">
            <input
              name="active"
              type="checkbox"
              defaultChecked={editing?.isActive || false}
            />{" "}
            Apply to new quotations
          </label>
        </div>
        <div className="discount-rule-form-actions">
          <button className="bc-primary" disabled={busy}>
            Save discount rule
          </button>
        </div>
      </form>
      <div className="discount-rules-directory" hidden={showForm}>
        <div className="discount-rules-heading">
          <div>
            <h2>Discount rules</h2>
            <p>Manage automatic discounts applied to new quotations.</p>
          </div>
          <button type="button" className="bc-primary" onClick={() => { setEditing(null); setCreating(true); }}>
            <Plus size={16} aria-hidden="true" /> Add discount rule
          </button>
        </div>
        {loadingRecords ? <p className="bc-helper" role="status">Loading discount rules…</p> : rules.length === 0 ? <p className="bc-helper" role="status">No discount rules yet.</p> : null}
        {rules.map((rule) => (
        <article className="business-record discount-rule-record" key={rule.id}>
          <div>
            <div className="discount-rule-title-row">
              <strong>{rule.name}</strong>
              <span className={`discount-rule-status ${rule.isActive ? "is-active" : "is-inactive"}`}>
                {rule.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p>
              <span className="discount-rule-summary-line">
                {rule.percentageOff}% + ₹{rule.fixedAmountOff}
              </span>
              <span className="discount-rule-summary-line">
                {(rule.categories?.length ? rule.categories.join(", ") : rule.category) || "All categories"}
              </span>
              <span className="discount-rule-summary-line">
                {(rule.deliveryPincodes || []).join(", ") || "All service areas"}
              </span>
            </p>
          </div>
          <div className="discount-rule-side">
            <div className="discount-rule-actions">
              <button
                type="button"
                className="bc-button"
                disabled={busy}
                aria-label={`Edit ${rule.name}`}
                onClick={() => {
                  setCreating(false);
                  setEditing(rule);
                  setFormVersion((value) => value + 1);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="bc-button"
                disabled={busy}
                aria-label={`${rule.isActive ? "Deactivate" : "Activate"} ${rule.name}`}
                onClick={() =>
                  void mutate(`/discount-rules/${rule.id}`, "PATCH", {
                    isActive: !rule.isActive,
                    expectedUpdatedAt: rule.updatedAt,
                  })
                }
              >
                {rule.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                className="bc-button discount-rule-delete"
                disabled={busy}
                aria-label={`Delete ${rule.name}`}
                onClick={() => void (async () => {
                  if (await confirmAdminAction({
                    title: `Delete “${rule.name}”?`,
                    message: "This discount rule will no longer apply to new quotations.",
                    confirmLabel: "Delete rule",
                    tone: "danger",
                  })) {
                    await mutate(`/discount-rules/${rule.id}`, "DELETE", undefined);
                  }
                })()}
              >
                Delete
              </button>
            </div>
            <div className="discount-rule-meta">
              <span>Created by <strong>{rule.createdBy || "Unknown"}</strong></span>
              <time dateTime={rule.createdAt}>
                {new Date(rule.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </time>
            </div>
          </div>
        </article>
        ))}
      </div>
    </>
  );
}
