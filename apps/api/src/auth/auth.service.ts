import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { hashPassword, verifyPassword } from "./password";
import { createHash, randomBytes } from "node:crypto";
import { Msg91WidgetService } from "./msg91-widget.service";

type StaffLoginInput = {
  phone?: string;
  email?: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly msg91Widget: Msg91WidgetService,
  ) {}

  async loginStaff(input: StaffLoginInput) {
    const staff = await this.prisma.staffUser.findUnique({
      where: input.phone
        ? { phone: input.phone }
        : { email: input.email!.toLowerCase() },
    });
    if (
      !staff?.isActive ||
      !verifyPassword(input.password, staff.passwordHash)
    ) {
      throw new UnauthorizedException("Invalid staff credentials");
    }
    return {
      accessToken: this.jwtService.sign({
        sub: staff.id,
        type: "STAFF",
        ver: staff.authVersion,
      }),
      user: {
        id: staff.id,
        email: staff.email,
        role: staff.role,
        name: staff.name,
      },
    };
  }

  findStaff(id: string) {
    return this.prisma.staffUser.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, phone: true, email: true, role: true },
    });
  }

  async changeStaffPassword(
    staffId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const staff = await this.prisma.staffUser.findFirst({
      where: { id: staffId, deletedAt: null, isActive: true },
      select: { passwordHash: true, authVersion: true },
    });
    if (!staff || !verifyPassword(currentPassword, staff.passwordHash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const account = await tx.staffUser.update({
        where: { id: staffId, deletedAt: null },
        data: { passwordHash: hashPassword(newPassword), authVersion: { increment: 1 } },
        select: { authVersion: true },
      });
      await tx.auditLog.create({
        data: {
          staffId,
          action: "STAFF_PASSWORD_CHANGED",
          entityType: "STAFF_USER",
          entityId: staffId,
          metadata: { otherSessionsRevoked: true },
        },
      });
      return account;
    });

    return {
      accessToken: this.jwtService.sign({
        sub: staffId,
        type: "STAFF",
        ver: updated.authVersion,
      }),
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
    const sessionToken = randomBytes(32).toString("hex");
    const customer = await this.prisma.$transaction(async (db) => {
      const account = await db.customer.upsert({
        where: { phone: verifiedPhone },
        update: {},
        create: { phone: verifiedPhone, name: "", pincode: "" },
      });
      await db.customerSession.create({
        data: {
          id: createHash("sha256").update(sessionToken).digest("hex"),
          customerId: account.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return account;
    });
    return {
      sessionToken,
      customer: {
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        email: customer.email,
        companyName: customer.companyName,
        shippingAddress: customer.shippingAddress,
        city: customer.city,
        pincode: customer.pincode,
      },
    };
  }
}
