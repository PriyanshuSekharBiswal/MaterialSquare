import { useEffect, useState } from "react";
import type { FormSubmit } from "../business/form-contracts";

type PurchaseRequestFormProps = {
  busy: boolean;
  submit: FormSubmit;
  request: <T>(path: string) => Promise<T>;
};
type CatalogueVariantOption = {
  id: string;
  label: string;
  unit: string;
  stockQuantity: string | number | null;
  productName: string;
  brand: string;
  category: string;
};

const field = (form: FormData, name: string) =>
  String(form.get(name) || "").trim();

export default function PurchaseRequestForm({
  busy,
  submit,
  request,
}: PurchaseRequestFormProps) {
  const [catalogueVariants, setCatalogueVariants] = useState<CatalogueVariantOption[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<CatalogueVariantOption | null>(null);
  const [requiredQuantity, setRequiredQuantity] = useState(0);
  const [clientStockQuantity, setClientStockQuantity] = useState(0);
  const sourcingQuantity = Math.max(0, requiredQuantity - clientStockQuantity);
  useEffect(() => {
    void request<{
      id: string;
      name: string;
      brand: string;
      category: string;
      categoryLabel: string;
      variants: { id: string; label: string; unit: string; stockQuantity: string | number | null }[];
    }[]>("/products/catalogue")
      .then((listings) =>
        setCatalogueVariants(
          listings.flatMap((listing) =>
            listing.variants.map((variant) => ({
              ...variant,
              productName: listing.name,
              brand: listing.brand,
              category: listing.categoryLabel || listing.category,
            })),
          ),
        ),
      )
      .catch(() => setCatalogueVariants([]));
  }, [request]);
  return (
    <form
      className="bc-form"
      onSubmit={(event) =>
        submit(event, (form) => ({
          deliveryAddress: field(form, "address"),
          deliveryCity: field(form, "city"),
          deliveryPincode: field(form, "pincode"),
          items: [
            {
              productName: field(form, "product"),
              brand: field(form, "brand"),
              category: field(form, "category"),
              ...(field(form, "catalogVariantId")
                ? { catalogVariantId: field(form, "catalogVariantId") }
                : {}),
              quantity: Math.max(
                0,
                Number(form.get("requiredQuantity")) -
                  Number(form.get("clientStockQuantity")),
              ),
              requiredQuantity: Number(form.get("requiredQuantity")),
              clientStockQuantity: Number(form.get("clientStockQuantity")),
              unit: field(form, "unit"),
            },
          ],
        }))
      }
    >
      <h2>Open a purchase request</h2>
      <div className="bc-fields">
        <label>
          Delivery address
          <input name="address" required />
        </label>
        <label>
          City
          <input name="city" required />
        </label>
        <label>
          PIN code
          <input name="pincode" pattern="[1-9][0-9]{5}" required />
        </label>
        <label>
          Product
          <input name="product" required />
        </label>
        <label className="bc-wide">
          Client catalogue product/pack (optional; loads saved stock)
          <select
            name="catalogVariantId"
            defaultValue=""
            onChange={(event) => {
              const option = catalogueVariants.find(
                (variant) => variant.id === event.currentTarget.value,
              );
              setSelectedVariant(option ?? null);
              if (!option) return;
              const form = event.currentTarget.form;
              if (!form) return;
              const set = (name: string, value: string) => {
                const input = form.elements.namedItem(name);
                if (input instanceof HTMLInputElement) input.value = value;
              };
              set("product", option.productName);
              set("brand", option.brand);
              set("category", option.category);
              set("unit", option.unit);
              const stock = option.stockQuantity == null ? 0 : Number(option.stockQuantity);
              set("clientStockQuantity", String(stock));
              setClientStockQuantity(stock);
            }}
          >
            <option value="">Choose a product pack</option>
            {catalogueVariants.map((variant) => (
              <option value={variant.id} key={variant.id}>
                {variant.productName} · {variant.brand} · {variant.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Brand (optional)
          <input name="brand" />
        </label>
        <label>
          Category
          <input name="category" required />
        </label>
          <label>
            Customer/order requirement
            <input
              name="requiredQuantity"
              type="number"
              min="0.001"
              step="0.001"
              required
              onChange={(event) =>
                setRequiredQuantity(Number(event.currentTarget.value) || 0)
              }
            />
          </label>
          <label>
            Available in client inventory
            <input
              name="clientStockQuantity"
              type="number"
              min="0"
              step="0.001"
              defaultValue="0"
              onChange={(event) =>
                setClientStockQuantity(Number(event.currentTarget.value) || 0)
              }
            />
            {selectedVariant?.stockQuantity == null && selectedVariant && (
              <small>That catalogue pack has no saved stock count. Confirm and enter the current quantity before creating this request.</small>
            )}
          </label>
        <label>
          Unit
          <input name="unit" defaultValue="unit" required />
        </label>
      </div>
      <p role="status">
        {selectedVariant
          ? `Selected pack: ${selectedVariant.productName} · ${selectedVariant.label}`
          : "Select a client catalogue pack to use its saved stock, or enter a material manually."}
      </p>
      <p role="status">
        {requiredQuantity > 0 && sourcingQuantity === 0
          ? "Client inventory covers this requirement; no supplier request is needed."
          : `Quantity to source from suppliers: ${sourcingQuantity}`}
      </p>
      <button className="bc-primary" disabled={busy || sourcingQuantity <= 0}>
        Create purchase request
      </button>
    </form>
  );
}
