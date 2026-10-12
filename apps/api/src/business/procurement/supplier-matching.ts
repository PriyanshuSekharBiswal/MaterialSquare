import type { PrismaService } from "../../prisma/prisma.service";

export type SupplierMatchItem = {
  productName: string;
  brand?: string;
  category?: string;
  unit: string;
  quantity: number;
  notes?: string;
  catalogVariantId?: string | null;
};

export type SupplierMatchLocation = {
  deliveryPincode: string;
  deliveryCity: string;
  deliveryState?: string | null;
  items: SupplierMatchItem[];
};

const FRESHNESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function loadMatchingSuppliers(prisma: PrismaService) {
  return prisma.supplier.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      products: {
        where: { isActive: true, deletedAt: null },
        include: { catalogVariant: { include: { listing: true } } },
      },
      ratings: true,
    },
  });
}

export async function matchSupplierCatalogue(
  prisma: PrismaService,
  request: SupplierMatchLocation,
  savedSuppliers?: Awaited<ReturnType<typeof loadMatchingSuppliers>>,
) {
  const suppliers = savedSuppliers ?? await loadMatchingSuppliers(prisma);
  const requestedItems = request.items.map((item) => ({
    ...item,
    matchedSupplierCount: 0,
    knownFreshCapacity: 0,
    coverage: "no-listing" as "no-listing" | "unknown" | "partial" | "covered",
    allocationSuggestions: [] as { supplierName: string; quantity: number }[],
  }));
  const candidates = suppliers
    .map((supplier) => {
      const matchedProducts = request.items.flatMap((item, requestedItemIndex) => {
        const product = supplier.products.find((candidate) => {
          if (
            item.catalogVariantId &&
            candidate.catalogVariantId === item.catalogVariantId
          ) return true;

          const sameProduct =
            candidate.productName.trim().toLowerCase() === item.productName.trim().toLowerCase() &&
            candidate.brand.trim().toLowerCase() === (item.brand || "").trim().toLowerCase() &&
            (!item.category || candidate.category.trim().toLowerCase() === item.category.trim().toLowerCase()) &&
            (!item.unit || candidate.unit.trim().toLowerCase() === item.unit.trim().toLowerCase());
          if (!sameProduct) return false;
          if (!item.catalogVariantId || !candidate.catalogVariantId) return true;

          const requestedNotes = (item.notes || "").toLowerCase();
          const supplierVariant = candidate.catalogVariant;
          if (!supplierVariant || !requestedNotes) return false;
          const attributes = supplierVariant.attributes;
          const attributeValues = attributes && typeof attributes === "object"
            ? Object.values(attributes as Record<string, unknown>)
                .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
                .map((value) => String(value).trim().toLowerCase())
                .filter(Boolean)
            : [];
          const variantDetails = [...new Set([supplierVariant.label.trim().toLowerCase(), ...attributeValues])];
          return supplierVariant.listing.name.trim().toLowerCase() === item.productName.trim().toLowerCase() &&
            supplierVariant.listing.brand.trim().toLowerCase() === (item.brand || "").trim().toLowerCase() &&
            supplierVariant.unit.trim().toLowerCase() === item.unit.trim().toLowerCase() &&
            variantDetails.length > 0 && variantDetails.every((detail) => requestedNotes.includes(detail));
        });
        if (!product) return [];
        const checkedAt = product.availabilityCheckedAt;
        const ageMs = checkedAt ? Date.now() - checkedAt.getTime() : null;
        const availabilityStatus = !checkedAt
          ? "unknown"
          : ageMs! > FRESHNESS_WINDOW_MS
            ? "outdated"
            : product.availableQuantity == null
              ? "unknown"
              : "recently-checked";
        return [{
          ...product,
          requestedQuantity: item.quantity,
          requestedItemIndex,
          availabilityStatus,
          listingUpdatedAt: product.updatedAt ?? null,
          availableFreshQuantity: availabilityStatus === "recently-checked" && product.availableQuantity != null
            ? Number(product.availableQuantity)
            : null,
          quantityCoverage: product.availableQuantity == null
            ? "unknown"
            : Number(product.availableQuantity) >= item.quantity
              ? "enough-recorded"
              : "partial-recorded",
        }];
      });
      const deliveryPincodeMatch = supplier.pincode === request.deliveryPincode;
      const serviceCoverageMatch = supplier.servicePincodes.includes(request.deliveryPincode);
      const cityMatch = supplier.city.trim().toLowerCase() === request.deliveryCity.trim().toLowerCase();
      const stateMatch = Boolean(request.deliveryState && supplier.state.trim().toLowerCase() === request.deliveryState.trim().toLowerCase());
      const locationMatchPercent = deliveryPincodeMatch ? 100 : serviceCoverageMatch ? 80 : cityMatch ? 60 : stateMatch ? 40 : 0;
      const locationMatchLabel = deliveryPincodeMatch ? "Exact PIN" : serviceCoverageMatch ? "Service PIN" : cityMatch ? "Same city" : stateMatch ? "Same state" : "Other location";
      const scores = supplier.ratings.flatMap((rating) => [rating.priceScore, rating.deliveryScore, rating.availabilityScore, rating.qualityScore, rating.serviceScore]);
      return {
        ...supplier,
        matchedItems: matchedProducts.map((product) => product.productName),
        matchedProducts,
        deliveryPincodeMatch,
        serviceCoverageMatch,
        serviceAreaMatch: deliveryPincodeMatch || serviceCoverageMatch,
        cityMatch,
        stateMatch,
        locationMatchPercent,
        locationMatchLabel,
        averageScore: scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null,
      };
    })
    .filter((supplier) => supplier.matchedProducts.length > 0)
    .sort((a, b) => b.locationMatchPercent - a.locationMatchPercent || (b.averageScore || 0) - (a.averageScore || 0));

  for (const [requestedItemIndex, requested] of requestedItems.entries()) {
    const listings = candidates.flatMap((supplier) => supplier.matchedProducts.filter((product) => product.requestedItemIndex === requestedItemIndex));
    requested.matchedSupplierCount = listings.length;
    const knownFreshCapacity = listings.reduce((sum, product) => sum + (product.availableFreshQuantity ?? 0), 0);
    requested.knownFreshCapacity = knownFreshCapacity;
    requested.coverage = !listings.length ? "no-listing" : listings.every((product) => product.availableFreshQuantity == null) ? "unknown" : knownFreshCapacity >= requested.quantity ? "covered" : "partial";
    let remaining = requested.quantity;
    for (const supplier of candidates) {
      const product = supplier.matchedProducts.find((candidate) => candidate.requestedItemIndex === requestedItemIndex);
      if (!product || product.availableFreshQuantity == null || remaining <= 0) continue;
      const capacity = Math.min(remaining, product.availableFreshQuantity);
      const minimum = product.minimumOrderQty == null ? 0 : Number(product.minimumOrderQty);
      if (capacity <= 0 || (minimum > 0 && capacity < minimum)) continue;
      requested.allocationSuggestions.push({ supplierName: supplier.name, quantity: capacity });
      remaining -= capacity;
    }
    if (requested.coverage === "covered" && remaining > 0) requested.coverage = "partial";
  }
  return {
    deliveryPincode: request.deliveryPincode,
    candidates,
    requestedItems,
    disclaimer: "Suggestions use saved supplier listings and location data only. Confirm current stock, price, and delivery terms directly before preparing a customer offer.",
  };
}
