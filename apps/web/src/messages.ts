import { COMPANY_INFO } from "./data/materialsData";
import type { MaterialItem } from "./types";
export function whatsappLink(message: string) {
  return `https://wa.me/91${COMPANY_INFO.phone}?text=${encodeURIComponent(message)}`;
}
export function emailLink(subject: string, message: string) {
  return `mailto:${COMPANY_INFO.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}
export function productMessage(product: MaterialItem) {
  return `Material Square — Product Enquiry\n\nProduct: ${product.name}\nBrand: ${product.brand}\nCode: ${product.code || product.id}${product.specification ? `\nSpecification: ${product.specification}` : ""}\n\nPlease help me confirm the required size, availability and pricing.`;
}
export interface RequestDetails {
  name: string;
  phone: string;
  email: string;
  company: string;
  address: string;
  city: string;
  pincode: string;
  delivery: string;
  notes: string;
}
export function requestMessage(
  details: RequestDetails,
  items: MaterialItem[],
  enquiry = false,
) {
  return [
    `Material Square — ${enquiry ? "General Enquiry" : "Quotation Request"}`,
    "",
    `Name: ${details.name.trim()}`,
    `Mobile: +91 ${details.phone}`,
    details.company.trim() ? `Company: ${details.company.trim()}` : "",
    details.email.trim() ? `Email: ${details.email.trim()}` : "",
    "",
    "Delivery / site location",
    `Address: ${details.address.trim()}`,
    `City: ${details.city.trim()}`,
    `PIN: ${details.pincode}`,
    `Required delivery: ${details.delivery || "Not decided"}`,
    "",
    ...(!enquiry
      ? [
          "Materials required",
          ...items.map(
            (i, n) =>
              `${n + 1}. ${i.name} | ${i.brand}${i.code ? ` | ${i.code}` : ""}${i.specification ? ` | ${i.specification}` : ""} — ${i.quantity || 1} ${i.unit}${i.price != null ? ` | indicative ₹${Number(i.price).toLocaleString("en-IN")}/${i.unit}` : ""}`,
          ),
        ]
      : []),
    "",
    details.notes.trim() ? `Notes: ${details.notes.trim()}` : "",
    "",
    enquiry
      ? "Please contact me about this enquiry."
      : "Please confirm availability, prices, taxes and delivery charges.",
  ]
    .filter((v, i, a) => v !== "" || a[i - 1] !== "")
    .join("\n");
}
