import type { StaffRequest } from "./staff-request";
import { demoAuthEnabled } from "./demo-mode";
import { StaffGuard } from "./access.guard";
import { PrismaService } from "../prisma/prisma.service";
import type { Request, Response } from "express";
import { CUSTOMER_COOKIE, checkCustomerMutation } from "./customer.guard";
import { validate } from "../common/validation";
import {
  Controller,
  Get,
  UseGuards,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  StaffLoginSchema,
  VerifyMsg91AccessTokenSchema,
} from "@material-square/types";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("mode") mode(@Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return { demo: demoAuthEnabled() };
  }

  @Get("staff/me")
  @UseGuards(StaffGuard)
  me(
    @Req() req: StaffRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    return this.prisma.staffUser.findUniqueOrThrow({
      where: { id: req.user.userId },
      select: {
        name: true,
        phone: true,
        email: true,
        role: true,
        isDemo: true,
      },
    });
  }

  @Post("staff/login")
  @HttpCode(HttpStatus.OK)
  async loginStaff(@Body() body: unknown) {
    const validated = validate(StaffLoginSchema, body);
    return this.authService.loginStaff(validated);
  }

  @Post("customer/otp/verify-msg91")
  @HttpCode(HttpStatus.OK)
  async verifyMsg91Otp(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    checkCustomerMutation(req);
    const validated = validate(VerifyMsg91AccessTokenSchema, body);
    const { sessionToken } =
      await this.authService.verifyCustomerMsg91AccessToken(validated);
    res.cookie(CUSTOMER_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.setHeader("Cache-Control", "no-store");
    return { success: true };
  }
}
