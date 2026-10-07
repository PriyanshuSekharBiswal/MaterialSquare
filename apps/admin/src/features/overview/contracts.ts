export type Stats = {
  customers: number;
  newCustomers30Days: number;
  openFollowups: number;
  closedFollowups: number;
};

export type WebsiteAnalytics = {
  days: number;
  totals: {
    pageViews: number;
    productViews: number;
    addToList: number;
    requestHandoffs: number;
  };
  daily: {
    date: string;
    pageViews: number;
    productViews: number;
    addToList: number;
    requestHandoffs: number;
  }[];
  topPages: { page: string; views: number }[];
  topProducts: { id: string; name: string; views: number; addToList?: number }[];
  topProductsByIntent?: { id: string; name: string; addToList: number }[];
  privacy: string;
};

export type RecentChange = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  title: string;
  category: string;
  entityLabel: string;
  actionLabel: string;
  changedFields: string[];
  changes: { field: string; before: unknown; after: unknown }[];
  staff: { name: string; role: string } | null;
};

export type RecentChanges = {
  since: string;
  categories: string[];
  items: RecentChange[];
  total: number;
  limit: number;
};
