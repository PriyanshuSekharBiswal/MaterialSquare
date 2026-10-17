import { MapPin } from "lucide-react";
import { formatEnumLabel } from "../../utils/formatEnumLabel";

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
  const receivedTotal = order.payments?.reduce(
    (sum, payment) => sum + Number(payment.amountInr),
    0,
  ) || 0;
  const balance = order.grandTotal == null
    ? null
    : Math.max(0, Number(order.grandTotal) - receivedTotal);

  return (
    <>
      {order.manualPaymentStatus && (
        <div className="order-payment-status" role="status">
          <span className="order-payment-status-badge" data-status={order.manualPaymentStatus}>
            {formatEnumLabel(order.manualPaymentStatus)}
          </span>
          <span>
            {order.manualPaymentMethod &&
              `${order.manualPaymentMethod === "OTHER" ? "Other offline method" : order.manualPaymentMethod}`}
            {order.manualPaymentRecordedAt &&
              ` · recorded ${new Date(order.manualPaymentRecordedAt).toLocaleString("en-IN")}`}
            {order.manualPaymentRecordedBy?.name &&
              ` by ${order.manualPaymentRecordedBy.name}`}
            {order.manualPaymentReference &&
              ` · reference ${order.manualPaymentReference}`}
          </span>
        </div>
      )}
    <details className="sales-order-details">
      <summary>View order materials and delivery details</summary>
      <div className="sales-order-details-content">
        {order.deliverySite && (
          <section className="sales-order-delivery" aria-label="Delivery address">
            <span className="sales-order-delivery-icon"><MapPin size={18} aria-hidden="true" /></span>
            <div>
              <span className="sales-order-detail-label">DELIVERY ADDRESS</span>
              <p>{order.deliverySite}</p>
            </div>
            {order.pincode && <span className="sales-order-pincode">PIN {order.pincode}</span>}
          </section>
        )}
        {(order.grandTotal != null || order.payments?.length) && (
          <section className="sales-order-finance" aria-label="Order totals">
            {order.grandTotal != null && (
              <div><span>Order total</span><strong>{money(order.grandTotal)}</strong></div>
            )}
            <div><span>Received</span><strong>{money(receivedTotal)}</strong></div>
            {balance != null && <div><span>Balance</span><strong>{money(balance)}</strong></div>}
          </section>
        )}
        {order.payments?.length ? (
          <section className="sales-order-payment-history" aria-label="Offline payment history">
            <h4>Payment history</h4>
            <ul>
              {order.payments.map((payment) => (
                <li key={payment.paymentNumber}>
                  <span><strong>{payment.paymentNumber}</strong><small>{payment.method}{payment.reference && ` · ${payment.reference}`}</small></span>
                  <span><strong>{money(payment.amountInr)}</strong><small>{new Date(payment.recordedAt).toLocaleString("en-IN")}{payment.recordedBy?.name && ` · ${payment.recordedBy.name}`}</small></span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      {!!order.items?.length && (
        <div className="table-scroll sales-order-items-table">
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
      </div>
    </details>
    </>
  );
}
