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
} from "@nestjs/common";
import type { StaffRequest } from "../auth/staff-request";
import { z } from "zod";
import { validate } from "../common/validation";
import { OrdersService } from "./orders.service";
import type { Response } from "express";

@Controller("orders")
@UseGuards(StaffGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getAllOrders() {
    return this.ordersService.findAll();
  }

  @Get(":id")
  getOrderById(@Param("id") id: string) {
    return this.ordersService.findById(id);
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
