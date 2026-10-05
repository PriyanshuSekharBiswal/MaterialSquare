import { BadRequestException } from "@nestjs/common";
import { CreateQuoteInput } from "@material-square/types";
import { DiscountRule, Prisma } from "@prisma/client";

type InventoryProduct = Prisma.ProductSKUGetPayload<{
  include: { brand: true };
}>;
type CatalogueProduct = Prisma.CatalogListingGetPayload<{
  include: { variants: true };
}>;

/** Resolve client selections to server-owned product, pack and unit snapshots. */
export function buildQuotationItems(
  input: CreateQuoteInput,
  products: InventoryProduct[],
  catalogue: CatalogueProduct[],
) {
  return input.items.map((line) => {
    const buildChoice = (selection: {
      productId?: string;
      catalogueId?: string;
      variantId?: string;
      unitPrice: number;
      specification: string;
    }) => {
      const product = products.find(
        (candidate) => candidate.id === selection.productId,
      );
      const listing = catalogue.find(
        (candidate) => candidate.id === selection.catalogueId,
      );
      const variant = listing?.variants.find(
        (candidate) => candidate.id === selection.variantId,
      );
      if (listing?.variants.length && !variant)
        throw new BadRequestException(
          "Choose a valid pack or size for this catalogue listing",
        );
      if (selection.variantId && !variant)
        throw new BadRequestException(
          "This variant does not belong to the selected listing",
        );
      return {
        productId: product?.id ?? null,
        catalogueId: listing?.id ?? null,
        variantId: variant?.id ?? null,
        productName: product?.name ?? listing!.name,
        brandName: product?.brand.name ?? listing!.brand,
        categoryName: product?.category ?? listing!.category,
        unit: variant?.unit ?? product?.unit ?? listing!.unit,
        specification:
          variant &&
          (selection.specification === variant.label ||
            selection.specification.startsWith(`${variant.label} · `))
            ? selection.specification
            : [variant?.label, selection.specification]
                .filter(Boolean)
                .join(" · "),
        unitPrice: selection.unitPrice,
        lineTotal: new Prisma.Decimal(line.quantity)
          .mul(selection.unitPrice)
          .toDecimalPlaces(2),
        discountAmount: new Prisma.Decimal(0),
      };
    };
    const primary = buildChoice(line);
    const alternatives = line.alternatives.map(buildChoice);
    const brands = [primary, ...alternatives].map((choice) =>
      choice.brandName.trim().toLocaleLowerCase(),
    );
    if (new Set(brands).size !== brands.length)
      throw new BadRequestException(
        "Choose a different brand for each quotation comparison option",
      );
    if (
      alternatives.some(
        (option) =>
          option.categoryName.toLocaleLowerCase() !==
            primary.categoryName.toLocaleLowerCase() ||
          option.unit.toLocaleLowerCase() !== primary.unit.toLocaleLowerCase(),
      )
    )
      throw new BadRequestException(
        "Brand comparison options must use the same material category and unit",
      );
    return {
      ...primary,
      quantityMt: line.quantity,
      options: alternatives,
    };
  });
}

export type QuotationLine = ReturnType<typeof buildQuotationItems>[number];

/** Apply the first matching rule in priority order, cap discounts, then round tax. */
export function calculateQuotationTotals(
  items: QuotationLine[],
  rules: DiscountRule[],
  input: Pick<CreateQuoteInput, "sitePincode" | "taxPct" | "freightAmount">,
) {
  const discountFor = (
    line: { categoryName: string; lineTotal: Prisma.Decimal },
    quantity: number,
  ) => {
    const rule = rules.find(
      (candidate) =>
        (!candidate.category || candidate.category === line.categoryName) &&
        (!candidate.deliveryPincodes.length ||
          candidate.deliveryPincodes.includes(input.sitePincode)) &&
        (!candidate.minimumQuantity ||
          quantity >= candidate.minimumQuantity.toNumber()) &&
        (!candidate.maximumQuantity ||
          quantity <= candidate.maximumQuantity.toNumber()),
    );
    if (!rule) return new Prisma.Decimal(0);
    const rawDiscount = line.lineTotal
      .mul(rule.percentageOff)
      .div(100)
      .add(rule.fixedAmountOff);
    return Prisma.Decimal.min(line.lineTotal, rawDiscount).toDecimalPlaces(2);
  };
  const pricedItems = items.map(({ options, ...item }) => ({
    ...item,
    discountAmount: discountFor(item, item.quantityMt),
    options: options.map((option) => ({
      ...option,
      discountAmount: discountFor(option, item.quantityMt),
    })),
  }));
  const subtotal = pricedItems.reduce(
    (sum, i) => sum.add(i.lineTotal),
    new Prisma.Decimal(0),
  );
  const discountAmount = pricedItems.reduce(
    (total, item) => total.add(item.discountAmount),
    new Prisma.Decimal(0),
  );
  const taxableSubtotal = subtotal.sub(discountAmount);
  const taxAmount = taxableSubtotal
    .mul(input.taxPct)
    .div(100)
    .toDecimalPlaces(2);
  return {
    items: pricedItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount: taxableSubtotal.add(taxAmount).add(input.freightAmount),
  };
}
