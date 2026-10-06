import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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

import { StaffLoginSchema } from "@material-square/types";

const customerVerifySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  accessToken: z.string().min(20).max(4096),
});

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
