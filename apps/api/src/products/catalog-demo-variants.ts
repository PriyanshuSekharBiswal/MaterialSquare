type SeedVariant = {
  label: string; unit: string; price?: number | null; compareAtPrice?: number | null;
  priceNote?: string; isInStock: boolean; stockQuantity?: number | null;
  minOrderQuantity?: number | null; attributes?: Record<string, string>;
  quantityBreaks?: Array<{ minimumQuantity: number; unitPrice: number }>;
};

const demo = (label: string, unit: string, price: number, compareAtPrice?: number, attributes: Record<string, string> = {}, quantityBreaks: SeedVariant["quantityBreaks"] = []): SeedVariant => ({
  label, unit, price, compareAtPrice, attributes, quantityBreaks, isInStock: false, stockQuantity: 0,
  priceNote: "Indicative demo price only. Client must confirm current rate, GST, delivery and stock before sale.",
});

// Illustrative first-publish data. Rates are demo values unless noted as copied
// from the supplied sample quotation or manufacturer MRP reference. Do not use
// demo values as supplier commitments.
const QUOTE_NOTE = "Sample quotation rate; not verified retail MRP. Confirm exact SKU, tax, delivery and current client price.";
const MRP_NOTE = "Manufacturer MRP reference; shade, location and current client offer may change the final price.";

const seedVariants: Record<string, SeedVariant[]> = {
  "ultratech-super": [demo("PPC · 50 kg bag", "50 kg bag", 405, 435, { cementType: "PPC", netWeight: "50 kg" }, [
    { minimumQuantity: 10, unitPrice: 395 },
    { minimumQuantity: 30, unitPrice: 385 },
    { minimumQuantity: 50, unitPrice: 375 },
  ])],
  "ambuja-kawach": [demo("Kawach · 50 kg bag", "50 kg bag", 425, 455, { netWeight: "50 kg" })],
  "jk-super-cement": [demo("OPC 53 · 50 kg bag", "50 kg bag", 410, 440, { grade: "OPC 53", netWeight: "50 kg" })],
  "shree-cement-roofon": [demo("Roofon · 50 kg bag", "50 kg bag", 395, 425, { netWeight: "50 kg" })],
  "astral-cpvc-pro": [
    demo("15 mm · 3 m length", "3 m length", 145, 165, { nominalDiameter: "15 mm", length: "3 m" }),
    demo("20 mm · 3 m length", "3 m length", 210, 235, { nominalDiameter: "20 mm", length: "3 m" }),
    demo("25 mm · 3 m length", "3 m length", 305, 340, { nominalDiameter: "25 mm", length: "3 m" }),
    demo("32 mm · 3 m length", "3 m length", 455, 495, { nominalDiameter: "32 mm", length: "3 m" }),
  ],
  "supreme-swr-pipes": [
    { label: "75 mm SWR pipe · 3 m", unit: "3 m length", price: 158, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "75 mm", class: "SWR" } },
    { label: "110 mm SWR pipe · per metre", unit: "metre", price: 245.62, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "110 mm", pressureClass: "6 kg/cm²" } },
    { label: "110 mm SWR elbow", unit: "piece", price: 152.21, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "110 mm", fitting: "Elbow" } },
    { label: "110 mm SWR tee", unit: "piece", price: 193.82, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "110 mm", fitting: "Tee" } },
    { label: "110 × 110 mm trap nahani with ojali", unit: "piece", price: 97.13, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { fitting: "Trap nahani with ojali" } },
    { label: "110 mm SWR coupler", unit: "piece", price: 81.11, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "110 mm", fitting: "Coupler" } },
  ],
  "finolex-upvc-pipes": [
    demo("20 mm · 3 m length", "3 m length", 125, 145, { nominalDiameter: "20 mm" }),
    demo("25 mm · 3 m length", "3 m length", 180, 205, { nominalDiameter: "25 mm" }),
    demo("32 mm · 3 m length", "3 m length", 265, 295, { nominalDiameter: "32 mm" }),
  ],
  "zoloto-brass-valves": [
    demo("15 mm (½ in) valve", "piece", 280, 315, { nominalDiameter: "15 mm" }),
    demo("20 mm (¾ in) valve", "piece", 375, 420, { nominalDiameter: "20 mm" }),
    demo("25 mm (1 in) valve", "piece", 520, 580, { nominalDiameter: "25 mm" }),
  ],
  "polycab-fr-wires": [
    demo("1.0 sq mm · 90 m coil · red", "90 m coil", 2650, 2950, { crossSection: "1.0 sq mm", colour: "Red", length: "90 m" }),
    demo("1.5 sq mm · 90 m coil · red", "90 m coil", 3850, 4250, { crossSection: "1.5 sq mm", colour: "Red", length: "90 m" }),
    demo("2.5 sq mm · 90 m coil · red", "90 m coil", 6250, 6850, { crossSection: "2.5 sq mm", colour: "Red", length: "90 m" }),
    demo("4.0 sq mm · 90 m coil · red", "90 m coil", 9950, 10800, { crossSection: "4.0 sq mm", colour: "Red", length: "90 m" }),
  ],
  "havells-lifeline-plus": [demo("1.5 sq mm · 90 m coil", "90 m coil", 3950, 4350, { crossSection: "1.5 sq mm", length: "90 m" }), demo("2.5 sq mm · 90 m coil", "90 m coil", 6450, 7050, { crossSection: "2.5 sq mm", length: "90 m" })],
  "finolex-flame-retardant": [demo("1.5 sq mm · 90 m coil", "90 m coil", 3450, 3800, { crossSection: "1.5 sq mm", length: "90 m" }), demo("2.5 sq mm · 90 m coil", "90 m coil", 5650, 6200, { crossSection: "2.5 sq mm", length: "90 m" })],
  "tata-tiscon-550d": [demo("8 mm · 12 m bar", "12 m bar", 390, 425, { diameter: "8 mm", length: "12 m" }), demo("10 mm · 12 m bar", "12 m bar", 605, 655, { diameter: "10 mm", length: "12 m" }), demo("12 mm · 12 m bar", "12 m bar", 870, 940, { diameter: "12 mm", length: "12 m" }), demo("16 mm · 12 m bar", "12 m bar", 1550, 1675, { diameter: "16 mm", length: "12 m" })],
  "asian-paints-apex-ultima": [demo("1 L · Base White", "1 L tin", 295, 340, { volume: "1 L", shade: "Base White" }), demo("4 L · Base White", "4 L tin", 1125, 1290, { volume: "4 L", shade: "Base White" }), demo("10 L · Base White", "10 L tin", 2740, 3150, { volume: "10 L", shade: "Base White" }), demo("20 L · Base White", "20 L drum", 5150, 5950, { volume: "20 L", shade: "Base White" })],
  "birla-opus-paints": [demo("1 L · White base", "1 L tin", 260, 295, { volume: "1 L" }), demo("4 L · White base", "4 L tin", 980, 1120, { volume: "4 L" }), demo("10 L · White base", "10 L tin", 2350, 2690, { volume: "10 L" }), demo("20 L · White base", "20 L bucket", 4500, 5150, { volume: "20 L" })],
  "jk-wallmaxx-putty": [demo("20 kg bag", "20 kg bag", 520, 570, { netWeight: "20 kg" }), demo("40 kg bag", "40 kg bag", 980, 1070, { netWeight: "40 kg" })],
  "jaquar-florentine-diverter": [demo("Concealed diverter set", "set", 4950, 5600, { finish: "Chrome" }), demo("Basin mixer", "piece", 3650, 4150, { finish: "Chrome" })],
  "cera-rimless-ewc": [demo("Wall-hung EWC set · white", "set", 18900, 21500, { colour: "White" })],
  "myk-laticrete-adhesive": [demo("20 kg bag", "20 kg bag", 620, 690, { netWeight: "20 kg" }), demo("30 kg bag", "30 kg bag", 890, 985, { netWeight: "30 kg" })],
  "asian-paints-tractor-emulsion": [
    { label: "1 L · Base White", unit: "1 L tin", price: 187, compareAtPrice: 258, priceNote: "User-provided reference screenshot rate and manufacturer MRP; client must confirm current price and shade tinting.", isInStock: false, stockQuantity: 0, attributes: { volume: "1 L", shade: "Base White" } },
    { label: "4 L · Base White", unit: "4 L tin", price: 724, compareAtPrice: 953, priceNote: MRP_NOTE, isInStock: false, stockQuantity: 0, attributes: { volume: "4 L", shade: "Base White" } },
    { label: "10 L · Base White", unit: "10 L tin", price: 1718, compareAtPrice: 2230, priceNote: MRP_NOTE, isInStock: false, stockQuantity: 0, attributes: { volume: "10 L", shade: "Base White" } },
    { label: "20 L · Base White", unit: "20 L drum", price: 3150, compareAtPrice: 4180, priceNote: MRP_NOTE, isInStock: false, stockQuantity: 0, attributes: { volume: "20 L", shade: "Base White" } },
  ],
  "polycab-etira-fr-wire": [
    { label: "1.5 sq mm · 90 m coil · red", unit: "90 m coil", price: 5550, compareAtPrice: null, priceNote: "Manufacturer MRP reference for the listed variant, inclusive of taxes. Client sale price and availability must be confirmed.", isInStock: false, stockQuantity: 0, attributes: { crossSection: "1.5 sq mm", length: "90 m", colour: "Red" } },
  ],
  "supreme-cpvc-quote-sample": [
    { label: "20 mm (¾ in) SDR-11 CPVC pipe", unit: "metre", price: 40.96, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "20 mm", class: "SDR-11", source: "sample quotation" } },
    { label: "20 mm 90° elbow", unit: "piece", price: 9.8, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "20 mm", fitting: "90° elbow" } },
    { label: "20 mm tee", unit: "piece", price: 16.03, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "20 mm", fitting: "Tee" } },
    { label: "20 × 15 mm brass tee", unit: "piece", price: 44.8, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { size: "20 × 15 mm", material: "Brass tee" } },
    { label: "20 × 15 mm brass elbow", unit: "piece", price: 40.71, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { size: "20 × 15 mm", material: "Brass elbow" } },
    { label: "20 mm coupler", unit: "piece", price: 7.77, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "20 mm", fitting: "Coupler" } },
    { label: "20 × 15 mm brass MTA", unit: "piece", price: 68.77, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { size: "20 × 15 mm", fitting: "Brass MTA" } },
    { label: "20 mm step-over bend", unit: "piece", price: 49.86, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "20 mm", fitting: "Step-over bend" } },
    { label: "20 mm clip P600", unit: "piece", price: 3, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { diameter: "20 mm", fitting: "Clip P600" } },
    { label: "CPVC solvent cement · 237 ml", unit: "237 ml tin", price: 208, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { volume: "237 ml", material: "CPVC solvent cement" } },
  ],
  "supreme-agricultural-solvent-sample": [
    { label: "PVC-U solvent · agriculture · 500 ml", unit: "500 ml tin", price: 183.5, compareAtPrice: null, priceNote: QUOTE_NOTE, isInStock: false, stockQuantity: 0, attributes: { volume: "500 ml", application: "Agriculture" } },
  ],
};

export function getDemoVariants(productId: string) {
  return (seedVariants[productId] || []).map((variant, sortOrder) => ({
    ...variant,
    code: `SEED-${productId}-${sortOrder + 1}`,
    attributes: variant.attributes || {},
    sortOrder,
  }));
}
