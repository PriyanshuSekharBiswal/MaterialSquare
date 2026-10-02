import { demoAuthEnabled, demoPhones } from "./demo-mode";
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
  RequestOtpSchema,
  VerifyOtpSchema,
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
    const demo = demoAuthEnabled();
    return { demo, customerPhones: demo ? demoPhones() : [] };
  }

  @Get("staff/me")
  @UseGuards(StaffGuard)
  me(
    @Req() req: Request & { user: { userId: string } },
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

  @Post("customer/otp/request")
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    checkCustomerMutation(req);
    const validated = validate(RequestOtpSchema, body);
    return this.authService.requestCustomerOtp(validated);
  }

  @Post("customer/otp/verify")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    checkCustomerMutation(req);
    const validated = validate(VerifyOtpSchema, body);
    const { sessionToken } =
      await this.authService.verifyCustomerOtp(validated);
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
