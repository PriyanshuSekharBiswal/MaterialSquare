import { demoAuthEnabled, demoPhones } from "./demo-mode";
import { Prisma } from "@prisma/client";
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  RequestOtpInput,
  VerifyOtpInput,
  StaffLoginInput,
} from "@material-square/types";
import { randomInt, createHmac, randomBytes, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword } from "./password";
import { jwtSecret } from "./jwt-config";
import { TwoFactorService } from "./twofactor.service";
import { Msg91WidgetService } from "./msg91-widget.service";
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private twoFactor: TwoFactorService,
    private msg91Widget: Msg91WidgetService,
  ) {}
  async loginStaff(input: StaffLoginInput) {
    const staff = await this.prisma.staffUser.findUnique({
      where: input.phone
        ? { phone: input.phone }
        : { email: input.email!.toLowerCase() },
    });
    if (
      !staff?.isActive ||
      Boolean(staff.isDemo) !== demoAuthEnabled() ||
      !verifyPassword(input.password, staff.passwordHash)
    )
      throw new UnauthorizedException("Invalid staff credentials");
    const user = {
      id: staff.id,
      email: staff.email,
      role: staff.role,
      name: staff.name,
    };
    return {
      accessToken: this.jwtService.sign({ sub: staff.id, type: "STAFF" }),
      user,
    };
  }
  private digest(phone: string, otp: string) {
    return createHmac("sha256", jwtSecret())
      .update(`${phone}:${otp}`)
      .digest("hex");
  }
  async requestCustomerOtp(input: RequestOtpInput) {
    const demo = demoAuthEnabled();
    if (demo && !demoPhones().includes(input.phone))
      throw new BadRequestException(
        "Use one of the demo customer numbers shown on the sign-in page",
      );
    const endpoint = process.env.OTP_WEBHOOK_URL;
    const hasTwoFactor = Boolean(process.env.TWOFACTOR_API_KEY?.trim());
    if (!demo && !endpoint && !hasTwoFactor)
      throw new ServiceUnavailableException("OTP delivery is not configured");
    const otp = randomInt(100000, 1000000).toString();
    const session = await this.prisma
      .$transaction(
        async (db) => {
          const recent = await db.otpSession.findFirst({
            where: {
              phone: input.phone,
              isDemo: demo,
              createdAt: { gt: new Date(Date.now() - (demo ? 5000 : 60000)) },
            },
          });
          if (recent)
            throw new HttpException(
              "Please wait before requesting another OTP",
              429,
            );
          await db.otpSession.updateMany({
            where: { phone: input.phone, isVerified: false, isDemo: demo },
            data: { isVerified: true },
          });
          return db.otpSession.create({
            data: {
              phone: input.phone,
              isDemo: demo,
              otpHash: this.digest(input.phone, otp),
              expiresAt: new Date(Date.now() + 300000),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034"
        )
          throw new HttpException(
            "Please wait before requesting another OTP",
            429,
          );
        throw error;
      });
    if (demo)
      return {
        success: true,
        message: "Demo code generated",
        demoOtp: otp,
        retryAfterSeconds: 5,
      };
    try {
      if (hasTwoFactor) {
        await this.twoFactor.sendOtp(input.phone, otp);
      } else {
        const response = await fetch(endpoint!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OTP_WEBHOOK_TOKEN || ""}`,
          },
          body: JSON.stringify({ phone: input.phone, otp }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Delivery failed");
      }
    } catch {
      await this.prisma.otpSession.delete({ where: { id: session.id } });
      throw new ServiceUnavailableException(
        "OTP could not be delivered. Please try again.",
      );
    }
    return { success: true, message: "OTP sent" };
  }
  async verifyCustomerOtp(input: VerifyOtpInput) {
    const demo = demoAuthEnabled();
    if (demo && !demoPhones().includes(input.phone))
      throw new BadRequestException("Use a demo customer number");
    const session = await this.prisma.otpSession.findFirst({
      where: {
        phone: input.phone,
        isDemo: demo,
        isVerified: false,
        expiresAt: { gt: new Date() },
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!session) throw new BadRequestException("Invalid or expired OTP");
    if (session.otpHash !== this.digest(input.phone, input.otp)) {
      await this.prisma.otpSession.updateMany({
        where: { id: session.id, attempts: { lt: 5 } },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Invalid or expired OTP");
    }
    return this.createCustomerSession(input.phone, demo, session.id);
  }

  async verifyCustomerMsg91AccessToken(input: {
    phone: string;
    accessToken: string;
  }) {
    if (demoAuthEnabled())
      throw new BadRequestException("Use the configured demo sign-in flow");
    const verifiedPhone = await this.msg91Widget.verifyAccessToken(
      input.accessToken,
    );
    if (verifiedPhone !== input.phone)
      throw new UnauthorizedException("Verified phone number does not match");
    return this.createCustomerSession(verifiedPhone, false);
  }

  private async createCustomerSession(
    phone: string,
    demo: boolean,
    otpSessionId?: string,
  ) {
    const sessionToken = randomBytes(32).toString("hex");
    await this.prisma.$transaction(async (db) => {
      if (otpSessionId) {
        const consumed = await db.otpSession.updateMany({
          where: {
            id: otpSessionId,
            isVerified: false,
            attempts: { lt: 5 },
            expiresAt: { gt: new Date() },
          },
          data: { isVerified: true },
        });
        if (consumed.count !== 1)
          throw new BadRequestException("Invalid or expired OTP");
      }
      const customer = await db.customer.upsert({
        where: { phone },
        update: {},
        create: { phone, name: "", pincode: "", isDemo: demo },
      });
      if (Boolean(customer.isDemo) !== demo)
        throw new BadRequestException(
          "This account belongs to a different environment",
        );
      await db.customerSession.create({
        data: {
          id: createHash("sha256").update(sessionToken).digest("hex"),
          customerId: customer.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    });
    return { sessionToken };
  }
}
