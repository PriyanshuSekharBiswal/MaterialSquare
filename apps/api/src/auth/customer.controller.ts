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
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { validate } from "../common/validation";
import {
  CUSTOMER_COOKIE,
  CustomerGuard,
  customerSessionHash,
} from "./customer.guard";

const customerSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  companyName: true,
  gstin: true,
  billingAddress: true,
  shippingAddress: true,
  city: true,
  pincode: true,
} as const;
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .union([z.string().trim().email().max(254), z.literal("")])
    .default(""),
  companyName: z.string().trim().max(150).default(""),
  gstin: z.union([z.string().trim().max(15), z.literal("")]).default(""),
  billingAddress: z.string().trim().max(500).default(""),
  shippingAddress: z.string().trim().max(500).default(""),
  city: z.string().trim().max(100).default(""),
  pincode: z
    .union([z.string().regex(/^[1-9]\d{5}$/), z.literal("")])
    .default(""),
});
type CustomerRequest = Request & { customerId: string };

const customerRfqSchema = z
  .object({
    customerName: z.string().trim().min(2).max(100),
    email: z
      .union([z.string().trim().email().max(254), z.literal("")])
      .default(""),
    companyName: z.string().trim().max(150).default(""),
    siteLocation: z.string().trim().min(4).max(500),
    city: z.string().trim().min(2).max(100),
    pincode: z.string().regex(/^[1-9]\d{5}$/),
    deliveryTiming: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
      .default(""),
    projectStage: z.string().trim().max(100).default(""),
    notes: z.string().trim().max(2000).default(""),
    items: z
      .array(
        z
          .object({
            catalogueId: z.string().max(100).optional(),
            variantId: z.string().max(100).optional(),
            name: z.string().trim().min(1).max(200),
            brand: z.string().trim().max(120).default(""),
            category: z.string().trim().max(100).default(""),
            unit: z.string().trim().min(1).max(40),
            quantity: z.number().finite().positive().max(1_000_000),
            specification: z.string().trim().max(500).default(""),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

@Controller("customer")
@UseGuards(CustomerGuard)
export class CustomerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me") async me(
    @Req() req: CustomerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    return this.prisma.customer.findUniqueOrThrow({
      where: { id: req.customerId },
      select: customerSelect,
    });
  }

  @Get("activity") async activity(
    @Req() req: CustomerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    const where = { customerId: req.customerId };
    const [requests, quotations, orders, loyalty] = await Promise.all([
      this.prisma.rfq.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          customerName: true,
          siteLocation: true,
          projectStage: true,
          deliveryTiming: true,
          notes: true,
          items: true,
          status: true,
          createdAt: true,
        },
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
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          subtotal: true,
          discountAmount: true,
          taxPct: true,
          taxAmount: true,
          freightAmount: true,
          totalAmount: true,
          validUntil: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantityMt: true,
              unitPrice: true,
              lineTotal: true,
              productName: true,
              brandName: true,
              categoryName: true,
              unit: true,
              specification: true,
              options: {
                select: {
                  id: true,
                  productName: true,
                  brandName: true,
                  categoryName: true,
                  unit: true,
                  specification: true,
                  unitPrice: true,
                  lineTotal: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          deliverySite: true,
          pincode: true,
          subtotal: true,
          taxAmount: true,
          freightAmount: true,
          loyaltyDiscountAmount: true,
          grandTotal: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantityMt: true,
              unitPrice: true,
              lineTotal: true,
              productName: true,
              brandName: true,
              categoryName: true,
              unit: true,
              specification: true,
            },
          },
          deliveries: {
            orderBy: { deliveredAt: "desc" },
            select: { deliveryNumber: true, deliveredAt: true, notes: true },
          },
          dispatch: {
            select: {
              currentStep: true,
              estimatedArrival: true,
              currentLocation: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prisma.loyaltyAccount.findUnique({
        where: { customerId: req.customerId },
        select: {
          pointsBalance: true,
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              type: true,
              points: true,
              description: true,
              expiresAt: true,
              isExpired: true,
              createdAt: true,
            },
          },
        },
      }),
    ]);
    return { requests, quotations, orders, loyalty };
  }

  @Get("quotations/:id") async quotation(
    @Req() req: CustomerRequest,
    @Param("id") id: string,
  ) {
    const quote = await this.prisma.quotation.findFirst({
      where: {
        id,
        customerId: req.customerId,
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
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        subtotal: true,
        discountAmount: true,
        taxPct: true,
        taxAmount: true,
        freightAmount: true,
        totalAmount: true,
        validUntil: true,
        createdAt: true,
        projectSiteAddress: true,
        sitePincode: true,
        items: {
          select: {
            id: true,
            quantityMt: true,
            unitPrice: true,
            lineTotal: true,
            productName: true,
            brandName: true,
            categoryName: true,
            unit: true,
            specification: true,
            options: {
              select: {
                id: true,
                productName: true,
                brandName: true,
                categoryName: true,
                unit: true,
                specification: true,
                unitPrice: true,
                lineTotal: true,
              },
            },
          },
        },
      },
    });
    if (!quote) throw new NotFoundException("Quotation not found");
    return quote;
  }

  @Get("orders/:id") async order(
    @Req() req: CustomerRequest,
    @Param("id") id: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id, customerId: req.customerId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        deliverySite: true,
        pincode: true,
        subtotal: true,
        taxAmount: true,
        freightAmount: true,
        loyaltyDiscountAmount: true,
        grandTotal: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantityMt: true,
            unitPrice: true,
            lineTotal: true,
            productName: true,
            brandName: true,
            categoryName: true,
            unit: true,
            specification: true,
          },
        },
        deliveries: {
          orderBy: { deliveredAt: "desc" },
          select: { deliveryNumber: true, deliveredAt: true, notes: true },
        },
        dispatch: {
          select: {
            currentStep: true,
            estimatedArrival: true,
            currentLocation: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  @Post("rfqs") async createRfq(
    @Req() req: CustomerRequest,
    @Body() body: unknown,
  ) {
    const input = validate(customerRfqSchema, body);
    const catalogueIds = [
      ...new Set(
        input.items
          .map(({ catalogueId }) => catalogueId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const listings = catalogueIds.length
      ? await this.prisma.catalogListing.findMany({
          where: { id: { in: catalogueIds }, isPublished: true },
          include: { variants: true },
        })
      : [];
    const listingsById = new Map(
      listings.map((listing) => [listing.id, listing]),
    );
    const items = input.items.map((item) => {
      if (!item.catalogueId) {
        return {
          material: item.name,
          brand: item.brand,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          specification: item.specification,
          source: "customer_request",
        };
      }
      const listing = listingsById.get(item.catalogueId);
      if (!listing)
        throw new NotFoundException(
          "A requested catalogue item is no longer available",
        );
      const variant = item.variantId
        ? listing.variants.find(({ id }) => id === item.variantId)
        : undefined;
      if (item.variantId && !variant)
        throw new NotFoundException(
          "A requested product variant is no longer available",
        );
      if (variant?.minOrderQuantity != null && item.quantity < Number(variant.minOrderQuantity))
        throw new BadRequestException(
          `${listing.name} requires a minimum of ${variant.minOrderQuantity.toString()} ${variant.unit}`,
        );
      return {
        catalogueId: listing.id,
        variantId: variant?.id || null,
        material: listing.name,
        brand: listing.brand,
        category: listing.categoryLabel,
        quantity: item.quantity,
        unit: variant?.unit || item.unit || listing.unit,
        specification: variant
          ? [
              variant.label,
              ...Object.values(variant.attributes as Record<string, string>),
            ]
              .filter(Boolean)
              .join(" · ")
          : item.specification,
        source: "client_catalogue",
      };
    });
    const saved = await this.prisma.$transaction(async (db) => {
      const customer = await db.customer.update({
        where: { id: req.customerId },
        data: {
          name: input.customerName,
          email: input.email || null,
          companyName: input.companyName || null,
          shippingAddress: input.siteLocation,
          city: input.city,
          pincode: input.pincode,
        },
        select: { id: true, phone: true },
      });
      return db.rfq.create({
        data: {
          customerId: customer.id,
          customerName: input.customerName,
          customerPhone: customer.phone,
          siteLocation: `${input.siteLocation}, ${input.city} ${input.pincode}`,
          projectStage: input.projectStage || null,
          deliveryTiming: input.deliveryTiming || null,
          notes: input.notes || null,
          items: items as Prisma.InputJsonValue,
        },
        select: { id: true, status: true, createdAt: true },
      });
    });
    return saved;
  }

  @Put("profile") updateProfile(
    @Req() req: CustomerRequest,
    @Body() body: unknown,
  ) {
    const data = validate(profileSchema, body);
    return this.prisma.customer.update({
      where: { id: req.customerId },
      data: {
        ...data,
        email: data.email || null,
        companyName: data.companyName || null,
        gstin: data.gstin || null,
        billingAddress: data.billingAddress || null,
        shippingAddress: data.shippingAddress || null,
      },
      select: customerSelect,
    });
  }

  @Post("logout") async logout(
    @Req() req: CustomerRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = customerSessionHash(req);
    if (sessionId)
      await this.prisma.customerSession.deleteMany({
        where: { id: sessionId, customerId: req.customerId },
      });
    res.clearCookie(CUSTOMER_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
    });
    res.setHeader("Cache-Control", "no-store");
    return { ok: true };
  }
}
