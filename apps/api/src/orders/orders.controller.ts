import { UseGuards } from "@nestjs/common";
import { StaffGuard } from "../auth/access.guard";
import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Res,
  Req,
  ForbiddenException,
  BadRequestException,
  Query,
} from "@nestjs/common";
import type { StaffRequest } from "../auth/staff-request";
import { z } from "zod";
import { validate } from "../common/validation";
import { OrdersService } from "./orders.service";
import type { Response } from "express";
import { roleHasPermission } from "../auth/staff-access";
import { parsePagination } from "../common/pagination";

@Controller("orders")
@UseGuards(StaffGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getAllOrders(
    @Req() req: StaffRequest,
    @Query("page") pageInput?: string,
    @Query("pageSize") pageSizeInput?: string,
  ) {
    const pagination = pageInput !== undefined || pageSizeInput !== undefined
      ? parsePagination(pageInput, pageSizeInput)
      : undefined;
    return this.ordersService.findAll(
      roleHasPermission(req.user.role, "finance.manage"),
      pagination,
    );
  }

  @Get(":id")
  getOrderById(@Param("id") id: string, @Req() req: StaffRequest) {
    return this.ordersService.findById(
      id,
      roleHasPermission(req.user.role, "finance.manage"),
    );
  }

  @Patch(":id/manual-payment")
  recordManualPayment(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    if (!["SUPER_ADMIN", "ADMIN", "ACCOUNTS_MANAGER"].includes(req.user.role))
      throw new ForbiddenException("Only accounts staff can record offline payments");
    const data = validate(
      z.object({
        amountInr: z.number().positive().finite().max(9999999999.99).refine(
          (amount) => /^\d+(?:\.\d{1,2})?$/.test(String(amount)),
          "Enter an amount with no more than two decimal places",
        ),
        method: z.enum(["CASH", "UPI", "CARD", "OTHER"]),
        reference: z.string().trim().max(120).optional(),
        note: z.string().trim().max(500).optional(),
      }),
      body,
    );
    return this.ordersService.recordManualPayment(id, data, req.user.userId);
  }

  @Post(":id/dispatch-challan")
  createDispatchChallan(
    @Param("id") id: string,
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    if (!["SUPER_ADMIN", "ADMIN", "DISPATCH_OFFICER"].includes(req.user.role))
      throw new ForbiddenException(
        "A dispatch user must create delivery challans",
      );
    const data = validate(
      z.object({
        truckNumber: z.string().trim().min(3).max(30),
        driverName: z.string().trim().min(2).max(150),
        driverPhone: z.string().regex(/^[6-9]\d{9}$/),
        weighbridgeGrossKg: z.number().positive(),
        weighbridgeTareKg: z.number().nonnegative(),
        estimatedArrival: z.string().datetime(),
      }),
      body,
    );
    if (data.weighbridgeGrossKg <= data.weighbridgeTareKg)
      throw new BadRequestException(
        "Gross vehicle weight must exceed tare weight",
      );
    return this.ordersService.createDispatchChallan(id, data, req.user.userId);
  }

  @Get(":id/track")
  async trackOrder(@Param("id") id: string) {
    const order = await this.ordersService.findById(id);
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      dispatch: order.dispatch,
    };
  }

  @Patch(":id/advance-dispatch")
  advanceDispatch(@Param("id") id: string, @Req() req: StaffRequest) {
    return this.ordersService.advanceDispatch(id, req.user.userId);
  }

  @Get(":id/challan/pdf")
  async downloadChallanPdf(@Param("id") id: string, @Res() res: Response) {
    const buffer = await this.ordersService.generateChallanPdf(id);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Delivery-Challan-${id}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }
}
