import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type {
  ExternalAcceptanceChannel,
  QuotationSelection,
} from "./quotation-acceptance.schema";

@Injectable()
export class QuotationAcceptanceService {
  constructor(private readonly prisma: PrismaService) {}

  acceptFromCommunication(
    quoteId: string,
    staffId: string,
    channel: ExternalAcceptanceChannel,
    selections: QuotationSelection[],
  ) {
    return this.accept(quoteId, selections, staffId, channel);
  }

  acceptFromCustomer(
    quoteId: string,
    customerId: string,
    selections: QuotationSelection[],
  ) {
    return this.accept(
      quoteId,
      selections,
      null,
      "CUSTOMER_PORTAL",
      customerId,
    );
  }

  async respondFromCustomer(
    quoteId: string,
    customerId: string,
    decision: "REJECT" | "REQUEST_CHANGES",
    notes: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: { id: quoteId, customerId },
      });
      if (!quote) throw new NotFoundException("Quotation not found");
      const claimed = await tx.quotation.updateMany({
        where: {
          id: quoteId,
          customerId,
          status: "QUOTE_SENT",
          validUntil: { gt: new Date() },
        },
        data: { status: "REJECTED" },
      });
      if (claimed.count !== 1)
        throw new ConflictException("This quotation is no longer current");
      if (decision === "REQUEST_CHANGES")
        await tx.quotationFollowUp.create({
          data: {
            quotationId: quoteId,
            channel: "INTERNAL",
            scheduledAt: new Date(),
            notes: `Customer requested changes: ${notes}`,
          },
        });
      await tx.auditLog.create({
        data: {
          action: `CUSTOMER_QUOTATION_${decision}`,
          entityType: "QUOTATION",
          entityId: quoteId,
          metadata: { actorType: "CUSTOMER", customerId, notes },
        },
      });
      return { decision };
    });
  }

  private accept(
    quoteId: string,
    selections: QuotationSelection[],
    staffId: string | null,
    channel: ExternalAcceptanceChannel | "CUSTOMER_PORTAL",
    ownerCustomerId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: {
          id: quoteId,
          ...(ownerCustomerId ? { customerId: ownerCustomerId } : {}),
        },
        include: {
          items: {
            include: { product: { include: { brand: true } }, options: true },
          },
        },
      });
      if (!quote) throw new NotFoundException("Quotation not found");
      const customerId = quote.customerId;
      if (!customerId)
        throw new ConflictException(
          "This quotation is not linked to a customer account",
        );
      if (quote.status !== "QUOTE_SENT" || quote.validUntil <= new Date())
        throw new ConflictException("This quotation is no longer current");
      if (
        selections.some(
          (selection) =>
            !quote.items.some((item) => item.id === selection.itemId),
        )
      )
        throw new ConflictException("A selected material is unavailable");

      const selectedItems = quote.items.map((item) => {
        const selection = selections.find(
          (candidate) => candidate.itemId === item.id,
        );
        if (!selection) return item;
        const option = item.options.find(
          (candidate) => candidate.id === selection.optionId,
        );
        if (!option)
          throw new ConflictException(
            "A selected comparison option is unavailable",
          );
        return { ...item, ...option, id: item.id, options: item.options };
      });

      // Claim the live quotation before creating the order so retries cannot
      // create duplicate orders or overwrite a competing decision.
      const claimed = await tx.quotation.updateMany({
        where: {
          id: quote.id,
          status: "QUOTE_SENT",
          validUntil: { gt: new Date() },
        },
        data: { status: "CONVERTED_TO_ORDER" },
      });
      if (claimed.count !== 1)
        throw new ConflictException("This quotation has already been handled");

      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { name: true, phone: true, city: true },
      });
      if (!customer)
        throw new ConflictException("Customer contact record is unavailable");

      const selectedAlternative = selections.length > 0;
      const subtotal = selectedAlternative
        ? selectedItems.reduce(
            (sum, item) => sum.add(item.lineTotal),
            new Prisma.Decimal(0),
          )
        : quote.subtotal;
      const discountAmount = selectedAlternative
        ? selectedItems.reduce(
            (sum, item) => sum.add(item.discountAmount),
            new Prisma.Decimal(0),
          )
        : quote.discountAmount;
      const marginAmount = selectedAlternative
        ? subtotal
            .sub(discountAmount)
            .mul(quote.marginPct)
            .div(100)
            .toDecimalPlaces(2)
        : quote.marginAmount;
      const taxAmount = selectedAlternative
        ? subtotal
            .sub(discountAmount)
            .add(marginAmount)
            .mul(quote.taxPct)
            .div(100)
            .toDecimalPlaces(2)
        : quote.taxAmount;
      const totalAmount = selectedAlternative
        ? subtotal
            .sub(discountAmount)
            .add(marginAmount)
            .add(taxAmount)
            .add(quote.freightAmount)
        : quote.totalAmount;

      if (selectedAlternative) {
        await Promise.all(
          selections.map((selection) => {
            const selected = selectedItems.find(
              (item) => item.id === selection.itemId,
            )!;
            return tx.quotationItem.update({
              where: { id: selection.itemId },
              data: {
                productId: selected.productId,
                catalogueId: selected.catalogueId,
                variantId: selected.variantId,
                productName: selected.productName,
                brandName: selected.brandName,
                categoryName: selected.categoryName,
                unit: selected.unit,
                specification: selected.specification,
                unitPrice: selected.unitPrice,
                lineTotal: selected.lineTotal,
                discountAmount: selected.discountAmount,
              },
            });
          }),
        );
        await tx.quotation.update({
          where: { id: quote.id },
          data: {
            subtotal,
            discountAmount,
            marginAmount,
            taxAmount,
            totalAmount,
          },
        });
      }

      const orderMaterialTotal = subtotal.sub(discountAmount).add(marginAmount);
      const orderMultiplier = subtotal.isZero()
        ? new Prisma.Decimal(1)
        : orderMaterialTotal.div(subtotal);
      const order = await tx.order.create({
        data: {
          orderNumber: `MS-ORD-${new Date().getFullYear()}-${randomUUID()}`,
          quotationId: quote.id,
          customerId,
          customerName: customer.name || quote.customerName,
          customerPhone: customer.phone,
          deliverySite: quote.projectSiteAddress,
          pincode: quote.sitePincode,
          status: "PROCESSING_AT_YARD",
          subtotal: orderMaterialTotal,
          taxAmount,
          freightAmount: quote.freightAmount,
          grandTotal: totalAmount,
          items: {
            create: selectedItems.map((item) => ({
              productId: item.productId,
              catalogueId: item.catalogueId,
              variantId: item.variantId,
              productName: item.productName,
              brandName: item.brandName,
              categoryName: item.categoryName,
              unit: item.unit,
              specification: item.specification,
              quantityMt: item.quantityMt,
              unitPrice: item.unitPrice.mul(orderMultiplier).toDecimalPlaces(2),
              lineTotal: item.lineTotal.mul(orderMultiplier).toDecimalPlaces(2),
            })),
          },
        },
      });
      const procurement = await tx.procurementRequest.create({
        data: {
          requestNumber: `MS-PR-${new Date().getFullYear()}-${randomUUID()}`,
          orderId: order.id,
          deliveryAddress: quote.projectSiteAddress,
          deliveryCity: customer.city || "Customer site",
          deliveryPincode: quote.sitePincode,
          items: selectedItems.map((item) => ({
            productName: item.productName,
            brand: item.brandName,
            category: item.categoryName,
            quantity: item.quantityMt.toNumber(),
            unit: item.unit,
            notes: item.specification,
          })),
          notes: `Created from quotation accepted through ${channel} (${quote.quoteNumber})`,
        },
      });

      await tx.auditLog.create({
        data: {
          staffId,
          action: ownerCustomerId
            ? "CUSTOMER_QUOTATION_ACCEPTED"
            : "STAFF_QUOTATION_ACCEPTED_EXTERNALLY",
          entityType: "ORDER",
          entityId: order.id,
          metadata: {
            actorType: ownerCustomerId ? "CUSTOMER" : "STAFF",
            customerId,
            channel,
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            orderNumber: order.orderNumber,
            procurementRequestId: procurement.id,
            itemCount: selectedItems.length,
            selectedAlternativeCount: selections.length,
          },
        },
      });
      return {
        decision: "ACCEPT",
        orderNumber: order.orderNumber,
        procurementNumber: procurement.requestNumber,
      };
    });
  }
}
