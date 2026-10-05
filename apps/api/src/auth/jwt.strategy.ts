import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../prisma/prisma.service";
import { jwtSecret } from "./jwt-config";
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
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
