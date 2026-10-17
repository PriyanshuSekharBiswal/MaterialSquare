const acronyms: Record<string, string> = {
  api: "API",
  gst: "GST",
  id: "ID",
  inr: "INR",
  po: "PO",
  rfq: "RFQ",
  sku: "SKU",
  upi: "UPI",
};

export function formatEnumLabel(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word, index) => {
      const normalized = word.toLocaleLowerCase();
      if (acronyms[normalized]) return acronyms[normalized];
      return index === 0
        ? `${normalized[0].toLocaleUpperCase()}${normalized.slice(1)}`
        : normalized;
    })
    .join(" ");
}
