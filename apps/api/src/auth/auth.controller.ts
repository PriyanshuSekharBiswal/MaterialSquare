import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import type { Response } from "express";
import type { StaffRequest } from "./staff-request";
import { StaffGuard } from "./access.guard";
import { validate } from "../common/validation";
import { AuthService } from "./auth.service";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

import { StaffLoginSchema } from "@material-square/types";

const customerVerifySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  accessToken: z.string().min(20).max(4096),
});
const staffProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    email: z.string().trim().email().max(254).nullable(),
    phone: z.string().regex(/^[6-9]\d{9}$/).nullable(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Keep at least one sign-in method on your account",
  });
const staffPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z
      .string()
      .min(6)
      .max(256)
      .regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,256}$/, {
        message: "Use at least 6 characters, including an uppercase letter, a number and a special character",
      }),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a new password that is different from your current password",
    path: ["newPassword"],
  });

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("customer/otp/verify-msg91")
  @HttpCode(HttpStatus.OK)
  async verifyCustomerOtp(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.verifyCustomerMsg91AccessToken(
      validate(customerVerifySchema, body),
    );
    res.cookie("ms_customer_session", session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.setHeader("Cache-Control", "no-store");
    return session.customer;
  }

  @Post("staff/login")
  @HttpCode(HttpStatus.OK)
  loginStaff(@Body() body: unknown) {
    const parsed = StaffLoginSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException(
        parsed.error.issues[0]?.message || "Check your sign-in details",
      );
    return this.authService.loginStaff(parsed.data);
  }

  @Get("staff/me")
  @UseGuards(StaffGuard)
  me(@Req() req: StaffRequest, @Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return this.authService.findStaff(req.user.userId);
  }

  @Patch("staff/me")
  @UseGuards(StaffGuard)
  async updateMyStaffProfile(
    @Req() req: StaffRequest,
    @Body() body: unknown,
  ) {
    const data = validate(staffProfileSchema, body);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.staffUser.update({
          where: { id: req.user.userId, deletedAt: null },
          data: {
            name: data.name,
            email: data.email?.toLowerCase() || null,
            phone: data.phone || null,
          },
          select: { id: true, name: true, phone: true, email: true, role: true },
        });
        await tx.auditLog.create({
          data: {
            staffId: req.user.userId,
            action: "STAFF_PROFILE_UPDATED",
            entityType: "STAFF_USER",
            entityId: req.user.userId,
            metadata: { changedFields: Object.keys(data) },
          },
        });
        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("That email or mobile number is already in use");
      throw error;
    }
  }

  @Patch("staff/me/password")
  @UseGuards(StaffGuard)
  changeMyStaffPassword(@Req() req: StaffRequest, @Body() body: unknown) {
    const data = validate(staffPasswordChangeSchema, body);
    return this.authService.changeStaffPassword(
      req.user.userId,
      data.currentPassword,
      data.newPassword,
    );
  }
}
