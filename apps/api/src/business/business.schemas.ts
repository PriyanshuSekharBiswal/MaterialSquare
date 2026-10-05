import { z } from "zod";

export const supplierInput = z.object({
  name: z.string().trim().min(2).max(150),
  legalName: z.string().trim().max(200).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.union([z.string().email().max(254), z.literal("")]).optional(),
  gstin: z.union([z.string().trim().max(15), z.literal("")]).optional(),
  address: z.string().trim().min(2).max(500),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).default("Uttar Pradesh"),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
  servicePincodes: z
    .array(z.string().regex(/^[1-9]\d{5}$/))
    .max(100)
    .default([]),
  status: z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).default("PENDING"),
  notes: z.string().max(5000).optional(),
});
export const supplierProductInput = z.object({
  productName: z.string().trim().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().trim().min(1).max(100),
  supplierSku: z.string().max(100).optional(),
  unit: z.string().trim().min(1).max(50),
  minimumOrderQty: z.number().positive().optional(),
  lastQuotedPrice: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
});
export const procurementItem = z.object({
  productName: z.string().trim().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().max(100),
  quantity: z.number().finite().positive(),
  unit: z.string().trim().min(1).max(50),
  notes: z.string().max(500).optional(),
});
export const procurementInput = z.object({
  orderId: z.string().optional(),
  deliveryAddress: z.string().trim().min(2).max(500),
  deliveryCity: z.string().trim().min(2).max(100),
  deliveryPincode: z.string().regex(/^[1-9]\d{5}$/),
  requiredBy: z.string().datetime().optional(),
  items: z.array(procurementItem).min(1).max(200),
  notes: z.string().max(5000).optional(),
});
export const supplierQuoteItem = z.object({
  productName: z.string().trim().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().max(100),
  quantity: z.number().finite().positive(),
  unit: z.string().trim().min(1).max(50),
  unitPrice: z.number().finite().nonnegative(),
});
export const supplierQuoteInput = z.object({
  supplierId: z.string().uuid(),
  items: z.array(supplierQuoteItem).min(1).max(200),
  totalAmount: z.number().finite().nonnegative(),
  leadTimeDays: z.number().int().nonnegative().max(365).optional(),
  available: z.boolean().default(true),
  validUntil: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
});
export const purchaseOrderInput = z.object({
  supplierQuoteId: z.string().uuid(),
  shippingAddress: z.string().trim().min(2).max(500),
  shippingContact: z.string().trim().min(10).max(100),
  taxAmount: z.number().nonnegative().default(0),
  freightAmount: z.number().nonnegative().default(0),
  notes: z.string().max(5000).optional(),
});
export const ruleInput = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().max(1000).optional(),
  deliveryPincodes: z
    .array(z.string().regex(/^[1-9]\d{5}$/))
    .max(500)
    .default([]),
  category: z.string().max(100).optional(),
  minimumQuantity: z.number().positive().optional(),
  maximumQuantity: z.number().positive().optional(),
  percentageOff: z.number().min(0).max(100).default(0),
  fixedAmountOff: z.number().min(0).default(0),
  priority: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(false),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
