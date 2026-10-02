import {
  Body,
  Controller,
  Get,
  Put,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  ConflictException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { validate } from "../common/validation";
import { CUSTOMER_COOKIE, CustomerGuard, sessionHash } from "./customer.guard";
import { expireCustomerLoyaltyPoints } from "../business/loyalty.service";
const profile = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.union([z.string().email().max(254), z.literal("")]).default(""),
  companyName: z.string().trim().max(150).default(""),
  shippingAddress: z.string().trim().max(500).default(""),
  city: z.string().trim().max(100).default(""),
  pincode: z
    .union([z.string().regex(/^[1-9]\d{5}$/), z.literal("")])
    .default(""),
});
const list = z
  .object({
    version: z.number().int().nonnegative(),
    items: z
      .array(
        z.object({
          id: z.string().min(1).max(150),
          catalogueId: z.string().min(1).max(100).optional(),
          name: z.string().trim().min(1).max(300),
          brand: z.string().max(100),
          unit: z.string().min(1).max(50),
          code: z.string().max(100).optional(),
          quantity: z.number().positive().max(1000000),
          specification: z.string().max(500).default(""),
        }),
      )
      .max(100),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.items.map((i) => i.id)).size !== v.items.length)
      ctx.addIssue({ code: "custom", message: "Duplicate materials" });
  });
export const customerSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  companyName: true,
  shippingAddress: true,
  city: true,
  pincode: true,
  materialList: true,
  listVersion: true,
} as const;
@Controller("customer")
@UseGuards(CustomerGuard)
export class CustomerController {
  constructor(private readonly prisma: PrismaService) {}
  @Get("me") me(
    @Req() req: Request & { customerId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    return this.prisma.customer.findUniqueOrThrow({
      where: { id: req.customerId },
      select: customerSelect,
    });
  }
  @Get("activity") async activity(
    @Req() req: Request & { customerId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    await this.prisma.$transaction((tx) => expireCustomerLoyaltyPoints(tx, req.customerId));
    const where = { customerId: req.customerId };
    const [requests, quotations, orders, loyalty] = await Promise.all([
      this.prisma.rfq.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.quotation.findMany({
        where,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.order.findMany({
        where,
        include: { items: { include: { product: true } }, dispatch: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.loyaltyAccount.findUnique({
        where: { customerId: req.customerId },
        include: {
          transactions: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      }),
    ]);
    return { requests, quotations, orders, loyalty };
  }
  @Put("profile") update(
    @Req() req: Request & { customerId: string },
    @Body() body: unknown,
  ) {
    return this.prisma.customer.update({
      where: { id: req.customerId },
      data: validate(profile, body),
      select: customerSelect,
    });
  }
  @Put("materials") async materials(
    @Req() req: Request & { customerId: string },
    @Body() body: unknown,
  ) {
    const data = validate(list, body);
    const result = await this.prisma.customer.updateMany({
      where: { id: req.customerId, listVersion: data.version },
      data: { materialList: data.items, listVersion: { increment: 1 } },
    });
    if (!result.count)
      throw new ConflictException(
        "Your material list changed on another device. Reload the saved list before editing again.",
      );
    return { version: data.version + 1 };
  }
  @Post("quotes/:id/respond") async respondToQuote(
    @Req() req: Request & { customerId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { decision } = validate(
      z.object({ decision: z.enum(["ACCEPT", "REJECT"]) }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({
        where: { id, customerId: req.customerId },
        include: { items: { include: { product: { include: { brand: true } } } } },
      });
      if (!quote) throw new ConflictException("Quotation is unavailable");
      if (quote.status !== "QUOTE_SENT" || quote.validUntil <= new Date())
        throw new ConflictException("This quotation is no longer current");
      if (decision === "REJECT") {
        await tx.quotation.update({
          where: { id: quote.id },
          data: { status: "REJECTED" },
        });
        return { decision, orderNumber: null };
      }
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: req.customerId },
        select: { name: true, phone: true, city: true },
      });
      const orderNumber = `MS-ORD-${new Date().getFullYear()}-${randomUUID()}`;
      const orderMaterialTotal = quote.subtotal
        .sub(quote.discountAmount)
        .add(quote.marginAmount);
      const orderMultiplier = quote.subtotal.isZero()
        ? new Prisma.Decimal(1)
        : orderMaterialTotal.div(quote.subtotal);
      const order = await tx.order.create({
        data: {
          orderNumber,
          quotationId: quote.id,
          customerId: req.customerId,
          customerName: customer.name || quote.customerName,
          customerPhone: customer.phone,
          deliverySite: quote.projectSiteAddress,
          pincode: quote.sitePincode,
          status: "PENDING_PAYMENT",
          subtotal: orderMaterialTotal,
          taxAmount: quote.taxAmount,
          freightAmount: quote.freightAmount,
          grandTotal: quote.totalAmount,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              quantityMt: item.quantityMt,
              unitPrice: item.unitPrice.mul(orderMultiplier).toDecimalPlaces(2),
              lineTotal: item.lineTotal.mul(orderMultiplier).toDecimalPlaces(2),
            })),
          },
        },
      });
      await tx.quotation.update({
        where: { id: quote.id },
        data: { status: "CONVERTED_TO_ORDER" },
      });
      const procurement = await tx.procurementRequest.create({
        data: {
          requestNumber: `MS-PR-${new Date().getFullYear()}-${randomUUID()}`,
          orderId: order.id,
          deliveryAddress: quote.projectSiteAddress,
          deliveryCity: customer.city || "Customer site",
          deliveryPincode: quote.sitePincode,
          items: quote.items.map((item) => ({
            productName: item.product.name,
            brand: item.product.brand.name,
            category: item.product.category,
            quantity: item.quantityMt.toNumber(),
            unit: item.product.unit,
            notes: "",
          })),
          notes: `Created from accepted customer quotation ${quote.quoteNumber}`,
        },
      });
      return { decision, orderNumber: order.orderNumber, procurementNumber: procurement.requestNumber };
    });
  }
  @Post("orders/:id/redeem-points") async redeemPoints(
    @Req() req: Request & { customerId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { points } = validate(z.object({ points: z.number().int().positive().max(1000000) }), body);
    return this.prisma.$transaction(async (tx) => {
      await expireCustomerLoyaltyPoints(tx, req.customerId);
      const order = await tx.order.findFirst({ where: { id, customerId: req.customerId } });
      if (!order || order.status !== "PENDING_PAYMENT")
        throw new ConflictException("Points can only be applied to an unpaid order in your account");
      if (order.loyaltyDiscountAmount.gt(0))
        throw new ConflictException("Points have already been applied to this order");
      const settings = await tx.loyaltyProgramSetting.findUnique({ where: { id: "default" } });
      if (!settings?.enabled || settings.redemptionValuePerPoint.lte(0))
        throw new ConflictException("Points redemption is not available");
      if (points < settings.minimumRedemptionPoints)
        throw new ConflictException(`Redeem at least ${settings.minimumRedemptionPoints} points`);
      const account = await tx.loyaltyAccount.findUnique({ where: { customerId: req.customerId } });
      if (!account || account.pointsBalance < points)
        throw new ConflictException("Your points balance is too low");
      const discount = settings.redemptionValuePerPoint.mul(points).toDecimalPlaces(2);
      if (discount.lte(0) || discount.gt(order.grandTotal))
        throw new ConflictException("Points cannot reduce the order below zero");
      const debited = await tx.loyaltyAccount.updateMany({
        where: { id: account.id, pointsBalance: { gte: points } },
        data: { pointsBalance: { decrement: points } },
      });
      if (!debited.count) throw new ConflictException("Your points balance changed. Reload and try again");
      const changed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT", loyaltyDiscountAmount: 0 },
        data: { loyaltyDiscountAmount: discount, grandTotal: { decrement: discount } },
      });
      if (!changed.count) throw new ConflictException("This order has already been updated");
      await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          customerId: req.customerId,
          orderId: order.id,
          type: "REDEEM",
          points: -points,
          description: `Points applied to order ${order.orderNumber}`,
        },
      });
      return { pointsRedeemed: points, discountAmount: discount, grandTotal: order.grandTotal.sub(discount) };
    });
  }
  @Post("logout") async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.prisma.customerSession.deleteMany({
      where: { id: sessionHash(req)! },
    });
    res.clearCookie(CUSTOMER_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
    });
    return { success: true };
  }
}
