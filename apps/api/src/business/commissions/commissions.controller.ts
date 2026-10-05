import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { StaffGuard } from "../../auth/access.guard";
import { validate } from "../../common/validation";
import type { StaffRequest } from "../../auth/staff-request";
import {
  CommissionsService,
  type CreateCommissionInput,
} from "./commissions.service";

const commissionInput = z.object({
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  beneficiaryName: z.string().trim().min(2).max(150),
  beneficiaryPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  basisAmount: z.number().nonnegative(),
  ratePct: z.number().min(0).max(100),
  notes: z.string().max(3000).optional(),
});

@Controller("commissions")
@UseGuards(StaffGuard)
export class CommissionController {
  constructor(private readonly commissions: CommissionsService) {}

  @Get()
  list() {
    return this.commissions.list();
  }

  @Post()
  async create(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(commissionInput, body) as CreateCommissionInput;
    return this.commissions.create(data, req.user.userId);
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string, @Req() req: StaffRequest) {
    return this.commissions.approve(id, req.user.userId, req.user.role);
  }
}
