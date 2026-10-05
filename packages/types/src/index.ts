import { z } from "zod";
export * from "./catalog-data";
export * from "./site-content";

// ==========================================
// USER & AUTH TYPES
// ==========================================

export enum StaffRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  SALES_MANAGER = "SALES_MANAGER",
  DISPATCH_OFFICER = "DISPATCH_OFFICER",
  ACCOUNTS_MANAGER = "ACCOUNTS_MANAGER",
  PROCUREMENT_HEAD = "PROCUREMENT_HEAD",
  CATALOG_MANAGER = "CATALOG_MANAGER",
  CONTENT_MANAGER = "CONTENT_MANAGER",
}

export interface StaffUser {
  id: string;
  name: string;
  email?: string | null;
  role: StaffRole;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  email?: string;
  companyName?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  pincode: string;
  creditLimit: number;
  availableCredit: number;
  isKycVerified: boolean;
  createdAt: string;
}

// ==========================================
// PRODUCT & SPECIFICATION TYPES
// ==========================================

export type SteelGrade = "Fe 500" | "Fe 550" | "Fe 550D" | "Fe 600" | "CRS";

export interface ProductBrand {
  id: string;
  name: string; // e.g. Tata Tiscon, Jindal Panther, JSW Neosteel, Kamdhenu, Shyam Steel
  tagline: string;
  isPrimary: boolean;
  complianceSpec: string; // e.g. IS 1786:2008
  carbonEquivMax: number;
  yieldStrengthMinMpa: number;
  elongationMinPct: number;
}

export interface ProductSKU {
  id: string;
  brandId: string;
  brandName: string;
  category:
    "TMT_REBAR" | "STRUCTURAL_STEEL" | "BINDING_WIRE" | "CEMENT" | "AGGREGATES";
  name: string;
  grade: SteelGrade;
  diameterMm: number; // 8, 10, 12, 16, 20, 25, 32
  standardLengthM: number; // 12m
  piecesPerBundle: number;
  weightPerMeterKg: number;
  unit: "MT" | "KG" | "BUNDLE" | "PIECE";
  basePricePerMt: number;
  taxPct: number; // 18% GST for steel
  inStock: boolean;
  availableStockMt: number;
}

// ==========================================
// QUOTATION & BOQ TYPES
// ==========================================

export type QuotationStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "MARGIN_ADJUSTED"
  | "QUOTE_SENT"
  | "ACCEPTED"
  | "CONVERTED_TO_ORDER"
  | "EXPIRED"
  | "REJECTED";

export interface QuotationLineItem {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  grade: string;
  diameterMm: number;
  quantityMt: number;
  unitPrice: number;
  lineTotal: number;
  customNotes?: string;
}

export interface Quotation {
  id: string;
  quoteNumber: string; // e.g. MS-QT-2026-0891
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  projectSiteAddress: string;
  sitePincode: string;
  status: QuotationStatus;
  items: QuotationLineItem[];
  subtotal: number;
  marginAmount: number;
  taxAmount: number;
  freightAmount: number;
  totalAmount: number;
  validUntil: string;
  drawingFileUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const QuoteProductSelectionSchema = z
  .object({
    productId: z.string().min(1).max(100).optional(),
    catalogueId: z.string().min(1).max(100).optional(),
    variantId: z.string().min(1).max(100).optional(),
    unitPrice: z.number().finite().nonnegative().max(99999999),
    specification: z.string().trim().max(500).default(""),
  })
  .superRefine((line, ctx) => {
    if (Boolean(line.productId) === Boolean(line.catalogueId))
      ctx.addIssue({
        code: "custom",
        message: "Select one inventory product or catalogue listing",
      });
    if (line.variantId && !line.catalogueId)
      ctx.addIssue({
        code: "custom",
        message: "A variant requires its catalogue listing",
      });
  });

export const CreateQuoteSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Valid 10-digit phone required"),
  customerEmail: z.string().email().optional(),
  projectSiteAddress: z.string().min(5, "Delivery address is required"),
  sitePincode: z
    .string()
    .regex(/^\d{6}$/, "Valid 6-digit Indian PIN code required"),
  items: z
    .array(
      z
        .object({
          productId: z.string().min(1).max(100).optional(),
          catalogueId: z.string().min(1).max(100).optional(),
          variantId: z.string().min(1).max(100).optional(),
          quantity: z.number().finite().positive().max(1000000).optional(),
          quantityMt: z.number().finite().positive().max(1000000).optional(),
          unitPrice: z.number().finite().nonnegative().max(99999999),
          specification: z.string().trim().max(500).default(""),
          alternatives: z.array(QuoteProductSelectionSchema).max(2).default([]),
        })
        .superRefine((line, ctx) => {
          if (Boolean(line.productId) === Boolean(line.catalogueId))
            ctx.addIssue({
              code: "custom",
              message: "Select one inventory product or catalogue listing",
            });
          if (line.variantId && !line.catalogueId)
            ctx.addIssue({
              code: "custom",
              message: "A variant requires its catalogue listing",
            });
          if ((line.quantity == null) === (line.quantityMt == null))
            ctx.addIssue({ code: "custom", message: "Enter one quantity" });
        })
        .transform(({ quantityMt, ...line }) => ({
          ...line,
          quantity: line.quantity ?? quantityMt!,
        })),
    )
    .min(1, "At least one item is required")
    .max(100),
  freightAmount: z.number().finite().nonnegative().default(0),
  taxPct: z.number().finite().min(0).max(100).default(18),
  drawingFileUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;

// ==========================================
// ORDER & DISPATCH LIFECYCLE TYPES
// ==========================================

export type OrderStatus =
  | "PROCESSING_AT_YARD"
  | "LOADED_ON_TRUCK"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "CANCELLED";

export interface DispatchTracking {
  orderId: string;
  truckNumber: string;
  driverName: string;
  driverPhone: string;
  challanNumber: string;
  weighbridgeGrossKg: number;
  weighbridgeTareKg: number;
  netWeightKg: number;
  currentStep: number; // 1 to 5
  estimatedArrival: string;
  currentLocationDesc?: string;
  gpsCoordinates?: { lat: number; lng: number };
}

export interface OrderRecord {
  id: string;
  orderNumber: string; // e.g. MS-ORD-2026-4421
  quotationId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliverySite: string;
  pincode: string;
  status: OrderStatus;
  items: QuotationLineItem[];
  subtotal: number;
  taxAmount: number;
  freightAmount: number;
  grandTotal: number;
  dispatch?: DispatchTracking;
  invoiceUrl?: string;
  challanUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ANALYTICS & EXECUTIVE KPI TYPES
// ==========================================

export interface ExecutiveDashboardKPIs {
  currentMonthGmvInr: number;
  previousMonthGmvInr: number;
  growthPct: number;
  activeRfqsCount: number;
  pendingDispatchCount: number;
  trucksOnRoadCount: number;
  accountsPayableInr: number;
  accountsReceivableInr: number;
  tonnageDispatchedThisMonthMt: number;
  topMovingBrands: { brand: string; tonnageMt: number; revenueInr: number }[];
  dailyRevenueTrend: { date: string; revenueInr: number; tonnageMt: number }[];
}

export const TRANSPORTATION_TRANSITIONS = {
  PLANNED: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["DISPATCHED", "DELAYED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "DELAYED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELAYED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELAYED", "PARTIALLY_DELIVERED"],
  PARTIALLY_DELIVERED: ["SCHEDULED", "DISPATCHED", "DELIVERED", "CANCELLED"],
  DELAYED: [
    "SCHEDULED",
    "DISPATCHED",
    "IN_TRANSIT",
    "OUT_FOR_DELIVERY",
    "CANCELLED",
  ],
  DELIVERED: [],
  CANCELLED: [],
} as const;
export type TransportationStatus = keyof typeof TRANSPORTATION_TRANSITIONS;

export * from "./legal-content";
