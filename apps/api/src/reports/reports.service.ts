import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { validate } from "../common/validation";
import { PrismaService } from "../prisma/prisma.service";

const rangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((range) => range.from <= range.to, {
    message: "End date must be on or after start date",
    path: ["to"],
  })
  .refine(
    (range) =>
      Date.parse(`${range.to}T00:00:00Z`) -
        Date.parse(`${range.from}T00:00:00Z`) <=
      365 * 86400000,
    {
      message: "Report ranges cannot exceed 366 calendar days",
      path: ["to"],
    },
  );

const REPORT_ROW_LIMIT = 500;

function reportRange(query: unknown) {
  const { from, to } = validate(rangeSchema, query);
  return {
    from,
    to,
    where: {
      gte: new Date(`${from}T00:00:00+05:30`),
      lt: new Date(Date.parse(`${to}T00:00:00+05:30`) + 86400000),
    },
  };
}

function amount(value: { toString(): string } | null | undefined) {
  return Number(value?.toString() || 0);
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(query: unknown) {
    const range = reportRange(query);
    const [orderGroups, quoteGroups, orders, quotations] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: range.where },
        _count: { _all: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.quotation.groupBy({
        by: ["status"],
        where: { createdAt: range.where },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: range.where },
        orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
        take: REPORT_ROW_LIMIT,
        select: {
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          items: { select: { id: true } },
        },
      }),
      this.prisma.quotation.findMany({
        where: { createdAt: range.where },
        orderBy: [{ createdAt: "desc" }, { quoteNumber: "desc" }],
        take: REPORT_ROW_LIMIT,
        select: {
          quoteNumber: true,
          revisionNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          validUntil: true,
          items: { select: { id: true } },
        },
      }),
    ]);
    const totalOrders = orderGroups.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const totalQuotations = quoteGroups.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const orderValueInr = orderGroups
      .filter(({ status }) => status !== "CANCELLED")
      .reduce((sum, row) => sum + amount(row._sum.grandTotal), 0);
    return {
      from: range.from,
      to: range.to,
      summary: {
        orderCount: totalOrders,
        activeOrderCount: orderGroups
          .filter(({ status }) => status !== "CANCELLED")
          .reduce((sum, row) => sum + row._count._all, 0),
        recordedOrderValueInr: orderValueInr,
        quotationCount: totalQuotations,
        acceptedQuotationCount: quoteGroups
          .filter(
            ({ status }) =>
              status === "ACCEPTED" || status === "CONVERTED_TO_ORDER",
          )
          .reduce((sum, row) => sum + row._count._all, 0),
      },
      orders: orders.map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        recordedValueInr: amount(order.grandTotal),
        itemCount: order.items.length,
      })),
      quotations: quotations.map((quote) => ({
        quoteNumber: quote.quoteNumber,
        revisionNumber: quote.revisionNumber,
        status: quote.status,
        createdAt: quote.createdAt,
        validUntil: quote.validUntil,
        recordedValueInr: amount(quote.totalAmount),
        itemCount: quote.items.length,
      })),
      orderStatus: orderGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
        recordedValueInr: amount(row._sum.grandTotal),
      })),
      quotationStatus: quoteGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
        recordedValueInr: amount(row._sum.totalAmount),
      })),
      truncated:
        totalOrders > orders.length || totalQuotations > quotations.length,
      rowLimit: REPORT_ROW_LIMIT,
      note: "Reported amounts reflect saved order and quotation documents.",
    };
  }

  async procurement(query: unknown) {
    const range = reportRange(query);
    const [requestGroups, purchaseOrderGroups, requests, purchaseOrders] =
      await Promise.all([
        this.prisma.procurementRequest.groupBy({
          by: ["status"],
          where: { createdAt: range.where },
          _count: { _all: true },
        }),
        this.prisma.purchaseOrder.groupBy({
          by: ["status"],
          where: { createdAt: range.where },
          _count: { _all: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.procurementRequest.findMany({
          where: { createdAt: range.where },
          orderBy: [{ createdAt: "desc" }, { requestNumber: "desc" }],
          take: REPORT_ROW_LIMIT,
          select: {
            requestNumber: true,
            status: true,
            createdAt: true,
            requiredBy: true,
            items: true,
            _count: { select: { purchaseOrders: true, supplierQuotes: true } },
          },
        }),
        this.prisma.purchaseOrder.findMany({
          where: { createdAt: range.where },
          orderBy: [{ createdAt: "desc" }, { purchaseOrderNumber: "desc" }],
          take: REPORT_ROW_LIMIT,
          select: {
            purchaseOrderNumber: true,
            status: true,
            createdAt: true,
            totalAmount: true,
            supplier: { select: { name: true } },
            request: { select: { requestNumber: true } },
          },
        }),
      ]);
    const requestCount = requestGroups.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const purchaseOrderCount = purchaseOrderGroups.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    const plannedPurchaseValueInr = purchaseOrderGroups
      .filter(({ status }) => status !== "CANCELLED")
      .reduce((sum, row) => sum + amount(row._sum.totalAmount), 0);
    return {
      from: range.from,
      to: range.to,
      summary: { requestCount, purchaseOrderCount, plannedPurchaseValueInr },
      requests: requests.map((request) => ({
        requestNumber: request.requestNumber,
        status: request.status,
        createdAt: request.createdAt,
        requiredBy: request.requiredBy,
        itemCount: Array.isArray(request.items) ? request.items.length : 0,
        supplierQuoteCount: request._count.supplierQuotes,
        purchaseOrderCount: request._count.purchaseOrders,
      })),
      purchaseOrders: purchaseOrders.map((order) => ({
        purchaseOrderNumber: order.purchaseOrderNumber,
        requestNumber: order.request.requestNumber,
        supplierName: order.supplier.name,
        status: order.status,
        createdAt: order.createdAt,
        plannedValueInr: amount(order.totalAmount),
      })),
      requestStatus: requestGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      purchaseOrderStatus: purchaseOrderGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
        plannedValueInr: amount(row._sum.totalAmount),
      })),
      truncated:
        requestCount > requests.length ||
        purchaseOrderCount > purchaseOrders.length,
      rowLimit: REPORT_ROW_LIMIT,
    };
  }

  async fulfillment(query: unknown) {
    const range = reportRange(query);
    const [orderGroups, planGroups, plans] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["status"],
        where: { createdAt: range.where },
        _count: { _all: true },
      }),
      this.prisma.transportationPlan.groupBy({
        by: ["status"],
        where: { order: { createdAt: range.where } },
        _count: { _all: true },
      }),
      this.prisma.transportationPlan.findMany({
        where: { order: { createdAt: range.where } },
        orderBy: [{ estimatedArrival: "asc" }, { updatedAt: "desc" }],
        take: REPORT_ROW_LIMIT,
        select: {
          status: true,
          dispatchAt: true,
          estimatedArrival: true,
          currentLocation: true,
          order: {
            select: {
              orderNumber: true,
              status: true,
              deliveries: { select: { id: true } },
            },
          },
        },
      }),
    ]);
    const orderCount = orderGroups.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );
    return {
      from: range.from,
      to: range.to,
      summary: {
        orderCount,
        deliveryPlanCount: planGroups.reduce(
          (sum, row) => sum + row._count._all,
          0,
        ),
        deliveredOrderCount:
          orderGroups.find(({ status }) => status === "DELIVERED")?._count
            ._all || 0,
      },
      ordersByStatus: orderGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      plansByStatus: planGroups.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
      deliveries: plans.map((plan) => ({
        orderNumber: plan.order.orderNumber,
        orderStatus: plan.order.status,
        planStatus: plan.status,
        dispatchAt: plan.dispatchAt,
        estimatedArrival: plan.estimatedArrival,
        currentLocation: plan.currentLocation,
        recordedDeliveryCount: plan.order.deliveries.length,
      })),
      truncated:
        planGroups.reduce((sum, row) => sum + row._count._all, 0) >
        plans.length,
      rowLimit: REPORT_ROW_LIMIT,
    };
  }
}
