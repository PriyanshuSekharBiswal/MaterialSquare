import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { JWT_ISSUER, JWT_STAFF_AUDIENCE, jwtSecret } from "./jwt-config";
import { staffSessionCookie } from "./staff-auth-cookie";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        staffSessionCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_STAFF_AUDIENCE,
    });
  }
  async validate(payload: { sub: string; type: string; ver?: number }) {
    if (payload.type !== "STAFF") throw new UnauthorizedException();
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: payload.sub },
    });
    if (!staff?.isActive || (payload.ver ?? 0) !== staff.authVersion) {
      throw new UnauthorizedException();
    }
    return {
      userId: staff.id,
      type: "STAFF",
      email: staff.email,
      role: staff.role,
    };
  }
}
