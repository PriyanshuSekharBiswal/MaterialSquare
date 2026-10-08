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
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { UploadedFiles } from "@nestjs/common";
import { diskStorage } from "multer";
import type { Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { open, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { PrismaService } from "../prisma/prisma.service";
import { PdfService } from "../pdf/pdf.service";
import { validate } from "../common/validation";
import {
  CUSTOMER_COOKIE,
  CustomerGuard,
  customerSessionHash,
} from "./customer.guard";

import { QuotationAcceptanceService } from "../quotes/quotation-acceptance.service";
import { CustomerQuotationResponseSchema } from "../quotes/quotation-acceptance.schema";
import { StorageService } from "../storage/storage.service";
import {
  RFQ_ATTACHMENT_MAX_FILE_BYTES,
  RFQ_ATTACHMENT_MAX_FILES,
} from "@material-square/types";

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
type RfqUpload = { path: string; originalname?: string; size?: number };

async function inspectRfqUpload(file: RfqUpload) {
  const handle = await open(file.path, "r");
  try {
    const bytes = Buffer.alloc(12);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    const header = bytes.subarray(0, bytesRead);
    if (
      header.length >= 5 &&
      header.subarray(0, 5).toString("ascii") === "%PDF-"
    )
      return "application/pdf";
    if (
      header.length >= 8 &&
      header
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
      return "image/png";
    if (
      header.length >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff
    )
      return "image/jpeg";
    if (
      header.length >= 12 &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP"
    )
      return "image/webp";
    throw new BadRequestException(
      "Use a PDF, JPEG, PNG, or WebP plan or photo.",
    );
  } finally {
    await handle.close();
  }
}

function safeAttachmentName(name?: string) {
  const baseName = (name || "project-plan")
    .split(/[\\/]/)
    .pop()!
    .replace(/[\r\n\u0000-\u001f]/g, "")
    .trim();
  return (
    baseName.replace(/[^\p{L}\p{N}._() -]/gu, "_").slice(0, 150) ||
    "project-plan"
  );
}

function parseMultipartRfqBody(body: Record<string, unknown>) {
  if (typeof body.payload !== "string") return body;
  try {
    return JSON.parse(body.payload) as unknown;
  } catch {
    throw new BadRequestException("Request details could not be read");
  }
}

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
      .max(100),
  })
  .strict();

@Controller("customer")
@UseGuards(CustomerGuard)
export class CustomerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceptance: QuotationAcceptanceService,
    private readonly pdf: PdfService,
    private readonly storage: StorageService,
  ) {}

  @Get("quotes/:id/pdf")
  async quotationPdf(
    @Req() req: CustomerRequest,
    @Param("id") id: string,
    @Res() response: Response,
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
      include: { items: { include: { product: true, options: true } } },
    });
    if (!quote) throw new NotFoundException("Quotation not found");

    const filename = quote.quoteNumber.replace(/[^A-Za-z0-9_-]/g, "_");
    const buffer = await this.pdf.generateQuotationPdf(quote);
    response
      .set({
        "Cache-Control": "private, no-store",
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quotation-${filename}.pdf"`,
      })
      .end(buffer);
  }

  @Post("quotations/:id/response")
  respond(
    @Req() req: CustomerRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const response = validate(CustomerQuotationResponseSchema, body);
    return response.decision === "ACCEPT"
      ? this.acceptance.acceptFromCustomer(
          id,
          req.customerId,
          response.selections,
        )
      : this.acceptance.respondFromCustomer(
          id,
          req.customerId,
          response.decision,
        );
  }

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
          attachments: {
            select: {
              id: true,
              fileName: true,
              mimeType: true,
              byteSize: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
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
          requestId: true,
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

  @Post("rfqs")
  @UseInterceptors(
    FilesInterceptor("attachments", RFQ_ATTACHMENT_MAX_FILES, {
      storage: diskStorage({
        destination: tmpdir(),
        filename: (_request, _file, callback) => callback(null, randomUUID()),
      }),
      limits: {
        fileSize: RFQ_ATTACHMENT_MAX_FILE_BYTES,
        files: RFQ_ATTACHMENT_MAX_FILES,
      },
    }),
  )
  async createRfq(
    @Req() req: CustomerRequest,
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: RfqUpload[] = [],
  ) {
    const uploadedKeys: string[] = [];
    try {
      const input = validate(customerRfqSchema, parseMultipartRfqBody(body));
      if (!input.items.length && !files.length)
        throw new BadRequestException(
          "Add a material or attach a project plan to your request.",
        );
      const attachments: Prisma.RfqAttachmentCreateWithoutRfqInput[] = [];
      for (const file of files) {
        const mimeType = await inspectRfqUpload(file);
        const storageKey = `rfq-attachments/${randomUUID()}`;
        await this.storage.uploadPrivateFile(
          storageKey,
          file.path,
          mimeType,
          file.size ?? 0,
        );
        uploadedKeys.push(storageKey);
        attachments.push({
          fileName: safeAttachmentName(file.originalname),
          mimeType,
          byteSize: file.size ?? 0,
          storageKey,
        });
      }
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
        if (
          variant?.minOrderQuantity != null &&
          item.quantity < Number(variant.minOrderQuantity)
        )
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
            attachments: { create: attachments },
          },
          select: { id: true, status: true, createdAt: true },
        });
      });
      return saved;
    } catch (cause) {
      await Promise.allSettled(
        uploadedKeys.map((key) => this.storage.deletePrivateFile(key)),
      );
      throw cause;
    } finally {
      await Promise.all(
        files.map((file) => unlink(file.path).catch(() => undefined)),
      );
    }
  }

  @Get("rfqs/:rfqId/attachments/:attachmentId")
  async downloadRfqAttachment(
    @Req() req: CustomerRequest,
    @Param("rfqId") rfqId: string,
    @Param("attachmentId") attachmentId: string,
    @Res() response: Response,
  ) {
    const attachment = await this.prisma.rfqAttachment.findFirst({
      where: {
        id: attachmentId,
        rfqId,
        rfq: { customerId: req.customerId },
      },
    });
    if (!attachment) throw new NotFoundException("Attachment not found");
    const filename = encodeURIComponent(attachment.fileName);
    if (!attachment.storageKey) {
      if (!attachment.content)
        throw new NotFoundException("Attachment content not found");
      response
        .set({
          "Cache-Control": "private, no-store",
          "Content-Type": attachment.mimeType,
          "Content-Length": String(attachment.byteSize),
          "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
          "X-Content-Type-Options": "nosniff",
        })
        .end(Buffer.from(attachment.content));
      return;
    }
    const stream = await this.storage.openPrivateFile(attachment.storageKey);
    response.set({
      "Cache-Control": "private, no-store",
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "X-Content-Type-Options": "nosniff",
    });
    stream.on("error", () => {
      stream.closeClient?.();
      if (!response.headersSent) response.status(500).end();
      else response.destroy();
    });
    stream.on("close", () => stream.closeClient?.());
    stream.on("end", () => stream.closeClient?.());
    stream.pipe(response);
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
