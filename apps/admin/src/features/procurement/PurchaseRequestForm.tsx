import type { FormSubmit } from "../business/form-contracts";

type PurchaseRequestFormProps = {
  busy: boolean;
  submit: FormSubmit;
};

const field = (form: FormData, name: string) =>
  String(form.get(name) || "").trim();

export default function PurchaseRequestForm({
  busy,
  submit,
}: PurchaseRequestFormProps) {
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
              quantity: Number(form.get("quantity")),
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
        <label>
          Brand (optional)
          <input name="brand" />
        </label>
        <label>
          Category
          <input name="category" required />
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min="0.001"
            step="0.001"
            required
          />
        </label>
        <label>
          Unit
          <input name="unit" defaultValue="unit" required />
        </label>
      </div>
      <button className="bc-primary" disabled={busy}>
        Create purchase request
      </button>
    </form>
  );
}
