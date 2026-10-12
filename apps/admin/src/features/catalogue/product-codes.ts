import type { EditableVariant } from "./CatalogueVariantsEditor";

export function generateVariantCodes(productCode: string, variants: EditableVariant[]) {
  const familyCode = productCode.trim().toLocaleUpperCase();
  if (!familyCode) return variants.map(() => "");

  // The family code identifies the base product; the sequence identifies a
  // specific sellable option while keeping its code compact and scannable.
  // Keep assigned sequences stable when staff reorder existing options.
  const used = new Set<number>();
  const sequences = variants.map((variant) => {
    const match = variant.code?.match(/-V(\d+)$/i);
    const sequence = match ? Number(match[1]) : 0;
    if (!sequence || used.has(sequence)) return 0;
    used.add(sequence);
    return sequence;
  });
  let next = Math.max(0, ...used) + 1;
  return sequences.map((sequence) => {
    const assigned = sequence || next++;
    return `${familyCode}-V${String(assigned).padStart(2, "0")}`;
  });
}
