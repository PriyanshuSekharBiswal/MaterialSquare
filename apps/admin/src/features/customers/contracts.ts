export type Material = {
  name: string;
  brand: string;
  quantity: number;
  unit: string;
  specification: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  shippingAddress?: string;
  city: string;
  pincode: string;
  createdAt?: string;
};

export type Followup = {
  id?: string;
  version?: number;
  customerName: string;
  phone: string;
  email: string;
  siteAddress: string;
  city: string;
  pincode: string;
  source: string;
  status: string;
  materials: Material[];
  notes: string;
  updatedAt?: string;
};

export type Page<T> = { items: T[]; total: number; page: number };
export type WorkspaceTab =
  | "overview"
  | "recent"
  | "customers"
  | "followups"
  | "catalogue"
  | "content"
  | "notifications"
  | "audit"
  | "team"
  | "sales"
  | "business"
  | "reports";

export const followupStatuses: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUOTED: "Quoted externally",
  CLOSED: "Closed",
};

export const blankFollowup = (): Followup => ({
  customerName: "",
  phone: "",
  email: "",
  siteAddress: "",
  city: "",
  pincode: "",
  source: "WHATSAPP",
  status: "NEW",
  materials: [],
  notes: "",
});
