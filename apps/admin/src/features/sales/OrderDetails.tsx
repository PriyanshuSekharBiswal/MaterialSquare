type Amount = string | number;
export type OrderSummary = {
  deliverySite?: string;
  pincode?: string;
  grandTotal?: Amount;
  manualPaymentStatus?: "UNPAID" | "PARTIALLY_PAID" | "PAID";
  manualPaymentMethod?: "CASH" | "UPI" | "CARD" | "OTHER" | null;
  manualPaymentReference?: string | null;
  manualPaymentRecordedAt?: string | null;
  manualPaymentRecordedBy?: { name: string } | null;
  payments?: {
    paymentNumber: string;
    amountInr: Amount;
    method: "CASH" | "UPI" | "CARD" | "OTHER";
    reference?: string | null;
    note?: string | null;
    recordedAt: string;
    recordedBy?: { name: string } | null;
  }[];
  items?: {
    id: string;
    productName: string;
    brandName: string;
    specification: string;
    quantityMt: Amount;
    unit: string;
    unitPrice: Amount;
    lineTotal: Amount;
  }[];
};
const money = (value: Amount) =>
  Number(value).toLocaleString("en-IN", { style: "currency", currency: "INR" });

export default function OrderDetails({ order }: { order: OrderSummary }) {
  return (
    <>
      {order.manualPaymentStatus && (
        <p className="order-payment-status" role="status">
          Payment: <strong>{order.manualPaymentStatus.replaceAll("_", " ")}</strong>
          {order.manualPaymentMethod &&
            ` · ${order.manualPaymentMethod === "OTHER" ? "Other offline method" : order.manualPaymentMethod}`}
          {order.manualPaymentRecordedAt &&
            ` · recorded ${new Date(order.manualPaymentRecordedAt).toLocaleString("en-IN")}`}
          {order.manualPaymentRecordedBy?.name &&
            ` by ${order.manualPaymentRecordedBy.name}`}
          {order.manualPaymentReference &&
            ` · reference ${order.manualPaymentReference}`}
        </p>
      )}
    <details>
      <summary>View order materials and delivery details</summary>
      {order.deliverySite && (
        <p>
          Delivery: {order.deliverySite}
          {order.pincode ? ` · ${order.pincode}` : ""}
        </p>
      )}
      {order.grandTotal != null && (
        <p>Order total: {money(order.grandTotal)}</p>
      )}
      {order.payments?.length ? (
        <section aria-label="Offline payment history">
          <p>
            Received: {money(order.payments.reduce((sum, payment) => sum + Number(payment.amountInr), 0))}
            {order.grandTotal != null && ` · balance ${money(Math.max(0, Number(order.grandTotal) - order.payments.reduce((sum, payment) => sum + Number(payment.amountInr), 0)))}`}
          </p>
          <ul>
            {order.payments.map((payment) => (
              <li key={payment.paymentNumber}>
                {payment.paymentNumber} · {money(payment.amountInr)} · {payment.method}
                {payment.reference && ` · ${payment.reference}`}
                {payment.recordedBy?.name && ` · recorded by ${payment.recordedBy.name}`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!!order.items?.length && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Specification</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productName}
                    <small>{item.brandName}</small>
                  </td>
                  <td>{item.specification || "—"}</td>
                  <td>
                    {Number(item.quantityMt).toLocaleString("en-IN")}{" "}
                    × {item.unit}
                  </td>
                  <td>{money(item.unitPrice)}</td>
                  <td>{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
    </>
  );
}
