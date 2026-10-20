export function formatQuantityUnit(
  quantity: number | string | null | undefined,
  unit: string | null | undefined,
) {
  const rawQuantity = quantity == null ? "" : String(quantity).trim();
  const numericQuantity = rawQuantity ? Number(rawQuantity) : Number.NaN;
  const quantityLabel = Number.isFinite(numericQuantity)
    ? numericQuantity.toLocaleString("en-IN", { maximumFractionDigits: 3 })
    : rawQuantity;
  const unitLabel = String(unit ?? "").trim();

  if (!quantityLabel) return unitLabel;
  if (!unitLabel) return quantityLabel;
  return `${quantityLabel} × ${unitLabel}`;
}

export function formatQuantityUnitText(
  value: string | null | undefined,
  fallbackUnit: string | null | undefined,
) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^((?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3}|\d+)(?:\.\d+)?)(?![\d,])\s*(.*)$/);
  if (!match) return raw;

  const quantity = Number(match[1].replace(/,/g, ""));
  const unit = match[2].trim() || String(fallbackUnit ?? "").trim();
  return Number.isFinite(quantity) && unit
    ? formatQuantityUnit(quantity, unit)
    : raw;
}
