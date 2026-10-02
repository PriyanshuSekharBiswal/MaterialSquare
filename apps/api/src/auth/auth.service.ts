import { demoAuthEnabled } from "./demo-mode";
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  StaffLoginInput,
} from "@material-square/types";
import { randomBytes, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword } from "./password";
import { Msg91WidgetService } from "./msg91-widget.service";
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
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
  async verifyCustomerMsg91AccessToken(input: {
    phone: string;
    accessToken: string;
  }) {
    const verifiedPhone = await this.msg91Widget.verifyAccessToken(
      input.accessToken,
    );
    if (verifiedPhone !== input.phone)
      throw new UnauthorizedException("Verified phone number does not match");
    return this.createCustomerSession(verifiedPhone, demoAuthEnabled());
  }

  private async createCustomerSession(phone: string, demo: boolean) {
    const sessionToken = randomBytes(32).toString("hex");
    await this.prisma.$transaction(async (db) => {
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
