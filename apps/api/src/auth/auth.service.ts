import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { verifyPassword } from "./password";

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
  ) {}

  async loginStaff(input: StaffLoginInput) {
    const staff = await this.prisma.staffUser.findUnique({
      where: input.phone
        ? { phone: input.phone }
        : { email: input.email!.toLowerCase() },
    });
    if (!staff?.isActive || !verifyPassword(input.password, staff.passwordHash)) {
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
      select: { name: true, phone: true, email: true, role: true },
    });
  }
}
