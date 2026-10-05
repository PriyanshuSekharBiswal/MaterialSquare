export type Profile = {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  companyName: string | null;
  gstin: string | null;
  billingAddress: string | null;
  shippingAddress: string | null;
  city: string;
  pincode: string;
};

export type PendingRfq = {
  customerName: string;
  email: string;
  companyName: string;
  siteLocation: string;
  city: string;
  pincode: string;
  deliveryTiming: string;
  projectStage: string;
  notes: string;
  items: {
    catalogueId?: string;
    variantId?: string;
    name: string;
    brand: string;
    category: string;
    unit: string;
    quantity: number;
    specification: string;
  }[];
};

export type AccountRouteState = {
  pendingRfq?: PendingRfq;
  notice?: string;
};

export type Line = {
  id: string;
  productName: string;
  brandName: string;
  categoryName: string;
  quantityMt: string | number;
  unitPrice: string | number;
  lineTotal: string | number;
  unit: string;
  specification: string;
  options?: Line[];
};

export type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  subtotal: string | number;
  discountAmount: string | number;
  taxAmount: string | number;
  freightAmount: string | number;
  totalAmount: string | number;
  validUntil: string;
  createdAt: string;
  items: Line[];
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  deliverySite: string;
  pincode: string;
  grandTotal: string | number;
  createdAt: string;
  items: Line[];
  deliveries: {
    deliveryNumber: string;
    deliveredAt: string;
    notes: string | null;
  }[];
  dispatch: {
    currentStep: number;
    estimatedArrival: string;
    currentLocation: string | null;
    updatedAt: string;
  } | null;
};

export type Activity = {
  requests: {
    id: string;
    status: string;
    siteLocation: string;
    projectStage: string | null;
    deliveryTiming: string | null;
    notes: string | null;
    items: {
      material: string;
      brand?: string;
      quantity: number;
      unit: string;
      specification?: string;
    }[];
    createdAt: string;
  }[];
  quotations: Quote[];
  orders: Order[];
  loyalty: {
    pointsBalance: number;
    transactions: {
      id: string;
      type: string;
      points: number;
      description: string;
      createdAt: string;
      expiresAt: string | null;
      isExpired: boolean;
    }[];
  } | null;
};

export const emptyActivity: Activity = {
  requests: [],
  quotations: [],
  orders: [],
  loyalty: null,
};

export const money = (value: string | number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(value),
  );
