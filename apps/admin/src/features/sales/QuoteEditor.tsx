import { useEffect, useMemo, useState, type FormEvent } from "react";

type Listing = {
  id: string;
  name: string;
  brand: string;
  unit: string;
  price: string | null;
  variants: { id: string; label: string; unit: string; price: string | null }[];
};
type Inventory = {
  id: string;
  name: string;
  unit: string;
  basePricePerMt: string;
  brand?: { name: string };
};
type Selection = {
  key: string;
  productId?: string;
  catalogueId?: string;
  variantId?: string;
  name: string;
  brand: string;
  unit: string;
  price: string;
};
type Line = {
  key: string;
  selection: string;
  quantity: string;
  rate: string;
  specification: string;
  alternatives: {
    key: string;
    selection: string;
    rate: string;
    specification: string;
  }[];
};
type Rfq = {
  id: string;
  customerName: string;
  customerPhone: string;
  siteLocation: string;
  items: {
    material: string;
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

export default function QuoteEditor({
  inventory,
  request,
  initialRequest,
  revision,
  editing = false,
  onCancel,
  onSaved,
}: {
  inventory: Inventory[];
  request: Request;
  initialRequest: Rfq | null;
  revision?: RevisionQuote | null;
  editing?: boolean;
  onCancel?: () => void;
  onSaved: () => Promise<void>;
}) {
  const [catalogue, setCatalogue] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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
                rate: option.unitPrice,
                specification: option.specification,
              })) || [],
          }))
        : initialRequest?.items.length
          ? initialRequest.items.map((item) => ({
              ...blank(),
              quantity: String(item.quantity),
              specification: [item.material, item.specification]
                .filter(Boolean)
                .join(" · "),
            }))
          : [blank()],
  );
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
              unit: variant.unit,
              price: variant.price || "",
            }))
          : [
              {
                key: `catalogue:${listing.id}`,
                catalogueId: listing.id,
                name: `${listing.name} · ${listing.brand}`,
                brand: listing.brand,
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
        unit: product.unit,
        price: product.basePricePerMt,
      })),
    ],
    [catalogue, inventory],
  );
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
    const chosen = lines.map((line) => ({
      line,
      product: options.find((option) => option.key === line.selection),
    }));
    if (chosen.some(({ product }) => !product)) {
      setError("Choose a product and its pack or size for every line.");
      return;
    }
    const duplicateBrand = lines.some((line) => {
      const primaryBrand = options.find(
        (option) => option.key === line.selection,
      )?.brand;
      const brands = [
        primaryBrand,
        ...line.alternatives.map(
          (alternative) =>
            options.find((option) => option.key === alternative.selection)
              ?.brand,
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
          (alternative) =>
            !options.some((option) => option.key === alternative.selection),
        ),
      )
    ) {
      setError("Choose a product for each brand comparison option.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await request(
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
          projectSiteAddress: form.get("address"),
          sitePincode: form.get("pincode"),
          notes: form.get("notes") || undefined,
          freightAmount: Number(form.get("freight")),
          taxPct: Number(form.get("tax")),
          items: chosen.map(({ line, product }) => ({
            productId: product?.productId,
            catalogueId: product?.catalogueId,
            variantId: product?.variantId,
            quantity: Number(line.quantity),
            unitPrice: Number(line.rate),
            specification: line.specification,
            alternatives: line.alternatives.map((alternative) => {
              const option = options.find(
                (candidate) => candidate.key === alternative.selection,
              )!;
              return {
                productId: option.productId,
                catalogueId: option.catalogueId,
                variantId: option.variantId,
                unitPrice: Number(alternative.rate),
                specification: alternative.specification,
              };
            }),
          })),
        },
      );
      await onSaved();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel-card panel-body">
      <h2>
        {revision
          ? editing
            ? "Edit quotation draft"
            : "Revise quotation"
          : "Create quotation"}
      </h2>
      <p>
        Select catalogue packs or inventory products and confirm the rate for
        each line. Add up to two alternative brands to compare beside the
        selected option. Catalogue prices are indicative; discounts and final
        totals are calculated when the draft is saved.
      </p>
      {(initialRequest || revision?.requestId) && (
        <p className="sales-source-request-note" role="status">
          Linked to customer request #{(initialRequest?.id || revision?.requestId || "").slice(0, 8).toUpperCase()}. The customer will see this quotation under that request after it is published.
        </p>
      )}
      {revision && (
        <p>
          Saving recalculates the draft totals. Published quotations require a
          new revision. Rates and discounts are recalculated; review the totals
          before publishing.{" "}
          <button
            type="button"
            className="btn-sm btn-secondary"
            onClick={onCancel}
          >
            Cancel editing
          </button>
        </p>
      )}
      {loading && <p role="status">Loading quotation catalogue…</p>}
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <form className="operation-form" onSubmit={save}>
        <fieldset disabled={busy || loading} className="quote-editor-fields">
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
              defaultValue={revision?.customerEmail || ""}
            />
          </label>
          <label>
            Delivery address
            <input
              name="address"
              required
              minLength={5}
              maxLength={500}
              defaultValue={
                revision?.projectSiteAddress || initialRequest?.siteLocation
              }
            />
          </label>
          <label>
            PIN code
            <input
              name="pincode"
              required
              pattern="[1-9][0-9]{5}"
              defaultValue={
                revision?.sitePincode ||
                initialRequest?.siteLocation.match(/\b[1-9][0-9]{5}\b/)?.[0]
              }
            />
          </label>
          <label>
            Search quotation products
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Product, brand, size or pack"
            />
          </label>
          {lines.map((line, index) => {
            const selected = options.find(
              (option) => option.key === line.selection,
            );
            const visible = options.filter(
              (option) =>
                option.key === line.selection ||
                option.name.toLowerCase().includes(search.toLowerCase()),
            );
            return (
              <fieldset className="quote-line" key={line.key}>
                <legend>Material {index + 1}</legend>
                <label>
                  Product for line {index + 1}
                  <select
                    required
                    value={line.selection}
                    onChange={(event) => {
                      const product = options.find(
                        (option) => option.key === event.target.value,
                      );
                      update(line.key, {
                        selection: event.target.value,
                        rate: product?.price || "",
                      });
                    }}
                  >
                    <option value="">Choose product / pack</option>
                    {visible.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.name} · {option.unit}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Quantity for line {index + 1}
                  {selected ? ` (${selected.unit})` : ""}
                  <input
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
                </label>
                <label>
                  Rate for line {index + 1}
                  {selected ? ` per ${selected.unit}` : ""}
                  <input
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
                </label>
                <label>
                  Specification for line {index + 1}
                  <input
                    maxLength={500}
                    value={line.specification}
                    onChange={(event) =>
                      update(line.key, { specification: event.target.value })
                    }
                  />
                </label>
                {line.alternatives.map((alternative, optionIndex) => {
                  const optionNumber = optionIndex + 2;
                  const selectedOption = options.find(
                    (option) => option.key === alternative.selection,
                  );
                  return (
                    <fieldset
                      className="quote-line quote-comparison-option"
                      key={alternative.key}
                    >
                      <legend>Brand comparison option {optionNumber}</legend>
                      <label>
                        Product and brand
                        <select
                          required
                          value={alternative.selection}
                          onChange={(event) => {
                            const product = options.find(
                              (option) => option.key === event.target.value,
                            );
                            updateAlternative(line.key, alternative.key, {
                              selection: event.target.value,
                              rate: product?.price || "",
                            });
                          }}
                        >
                          <option value="">Choose product and brand</option>
                          {visible.map((option) => (
                            <option key={option.key} value={option.key}>
                              {option.name} · {option.unit}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Rate
                        {selectedOption ? ` per ${selectedOption.unit}` : ""}
                        <input
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
                      </label>
                      <label>
                        Specification
                        <input
                          maxLength={500}
                          value={alternative.specification}
                          onChange={(event) =>
                            updateAlternative(line.key, alternative.key, {
                              specification: event.target.value,
                            })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        onClick={() =>
                          update(line.key, {
                            alternatives: line.alternatives.filter(
                              (option) => option.key !== alternative.key,
                            ),
                          })
                        }
                      >
                        Remove comparison option {optionNumber}
                      </button>
                    </fieldset>
                  );
                })}
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  disabled={line.alternatives.length >= 2}
                  onClick={() =>
                    update(line.key, {
                      alternatives: [
                        ...line.alternatives,
                        {
                          key: crypto.randomUUID(),
                          selection: "",
                          rate: "",
                          specification: "",
                        },
                      ],
                    })
                  }
                >
                  Add brand comparison option ({line.alternatives.length + 1}/3)
                </button>
                <button
                  type="button"
                  className="btn-sm btn-secondary"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((row) => row.key !== line.key),
                    )
                  }
                >
                  Remove line {index + 1}
                </button>
              </fieldset>
            );
          })}
          <button
            type="button"
            className="btn-sm btn-secondary"
            disabled={lines.length >= 100}
            onClick={() => setLines((current) => [...current, blank()])}
          >
            Add quotation line
          </button>
          <label>
            Freight
            <input
              name="freight"
              type="number"
              min="0"
              step="0.01"
              defaultValue={revision?.freightAmount || "0"}
              required
            />
          </label>
          <label>
            Tax %
            <input
              name="tax"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={
                revision &&
                Number(revision.subtotal) +
                  Number(revision.marginAmount) -
                  Number(revision.discountAmount) >
                  0
                  ? (
                      (100 * Number(revision.taxAmount)) /
                      (Number(revision.subtotal) +
                        Number(revision.marginAmount) -
                        Number(revision.discountAmount))
                    ).toFixed(2)
                  : "18"
              }
              required
            />
          </label>
          <label>
            Quotation notes
            <textarea
              name="notes"
              maxLength={5000}
              defaultValue={revision?.notes || ""}
            />
          </label>
          <p>
            Material subtotal before discounts, tax and freight: ₹
            {lines
              .reduce(
                (sum, line) =>
                  sum + (Number(line.quantity) || 0) * (Number(line.rate) || 0),
                0,
              )
              .toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
          <button className="btn-sm btn-primary" disabled={!options.length}>
            Save draft
          </button>
        </fieldset>
      </form>
    </section>
  );
}
