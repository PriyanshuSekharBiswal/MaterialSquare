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
import type { Request, Response } from "express";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import { CustomerQuotationResponseSchema } from "../quotes/quotation-acceptance.schema";
import { QuotationAcceptanceService } from "../quotes/quotation-acceptance.service";
import { validate } from "../common/validation";
import { CUSTOMER_COOKIE, CustomerGuard, sessionHash } from "./customer.guard";
import { expireCustomerLoyaltyPoints } from "../business/loyalty/loyalty-expiry";
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
          variantId: z.string().min(1).max(100).optional(),
          name: z.string().trim().min(1).max(300),
          brand: z.string().max(100),
          unit: z.string().min(1).max(50),
          code: z.string().max(100).optional(),
          quantity: z.number().positive().max(1000000),
          specification: z.string().max(500).default(""),
          // Customer-provided display estimate only. This JSON is never used
          // to calculate or confirm a quotation.
          price: z.number().finite().nonnegative().optional(),
          compareAtPrice: z.number().finite().nonnegative().optional(),
          priceNote: z.string().max(160).optional(),
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotationAcceptance: QuotationAcceptanceService,
  ) {}
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
    await this.prisma.$transaction((tx) =>
      expireCustomerLoyaltyPoints(tx, req.customerId),
    );
    const where = { customerId: req.customerId };
    const [requests, quotations, orders, loyalty] = await Promise.all([
      this.prisma.rfq.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.quotation.findMany({
        where: {
          ...where,
          status: {
            in: [
              "QUOTE_SENT",
              "ACCEPTED",
              "CONVERTED_TO_ORDER",
              "EXPIRED",
              "REJECTED",
            ],
          },
        },
        include: { items: { include: { product: true, options: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      this.prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true, deliveries: true } },
          deliveries: {
            orderBy: { deliveredAt: "desc" },
            select: { deliveryNumber: true, deliveredAt: true },
          },
          dispatch: true,
        },
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
    const { decision, selections } = validate(
      CustomerQuotationResponseSchema,
      body,
    );
    return this.quotationAcceptance.respondAsCustomer(
      id,
      req.customerId,
      decision,
      selections,
    );
  }
  @Post("orders/:id/redeem-points") async redeemPoints(
    @Req() req: Request & { customerId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const { points } = validate(
      z.object({ points: z.number().int().positive().max(1000000) }),
      body,
    );
    return this.prisma.$transaction(async (tx) => {
      await expireCustomerLoyaltyPoints(tx, req.customerId);
      const order = await tx.order.findFirst({
        where: { id, customerId: req.customerId },
      });
      if (!order || order.status !== "PROCESSING_AT_YARD")
        throw new ConflictException(
          "Points can only be applied while your order is processing",
        );
      if (order.loyaltyDiscountAmount.gt(0))
        throw new ConflictException(
          "Points have already been applied to this order",
        );
      const settings = await tx.loyaltyProgramSetting.findUnique({
        where: { id: "default" },
      });
      if (!settings?.enabled || settings.redemptionValuePerPoint.lte(0))
        throw new ConflictException("Points redemption is not available");
      if (points < settings.minimumRedemptionPoints)
        throw new ConflictException(
          `Redeem at least ${settings.minimumRedemptionPoints} points`,
        );
      const account = await tx.loyaltyAccount.findUnique({
        where: { customerId: req.customerId },
      });
      if (!account || account.pointsBalance < points)
        throw new ConflictException("Your points balance is too low");
      const discount = settings.redemptionValuePerPoint
        .mul(points)
        .toDecimalPlaces(2);
      if (discount.lte(0) || discount.gt(order.grandTotal))
        throw new ConflictException(
          "Points cannot reduce the order below zero",
        );
      const debited = await tx.loyaltyAccount.updateMany({
        where: { id: account.id, pointsBalance: { gte: points } },
        data: { pointsBalance: { decrement: points } },
      });
      if (!debited.count)
        throw new ConflictException(
          "Your points balance changed. Reload and try again",
        );
      const changed = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "PROCESSING_AT_YARD",
          loyaltyDiscountAmount: 0,
        },
        data: {
          loyaltyDiscountAmount: discount,
          grandTotal: { decrement: discount },
        },
      });
      if (!changed.count)
        throw new ConflictException("This order has already been updated");
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
      return {
        pointsRedeemed: points,
        discountAmount: discount,
        grandTotal: order.grandTotal.sub(discount),
      };
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
