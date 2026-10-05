import {
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

const loginSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().trim().email().max(254).optional(),
  password: z.string().min(8).max(256),
}).refine((input) => Boolean(input.phone || input.email), {
  message: "Enter your mobile number or email address",
});

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("staff/login")
  @HttpCode(HttpStatus.OK)
  loginStaff(@Body() body: unknown) {
    return this.authService.loginStaff(validate(loginSchema, body));
  }

  @Get("staff/me")
  @UseGuards(StaffGuard)
  me(@Req() req: StaffRequest, @Res({ passthrough: true }) res: Response) {
    res.setHeader("Cache-Control", "no-store");
    return this.authService.findStaff(req.user.userId);
  }
}
