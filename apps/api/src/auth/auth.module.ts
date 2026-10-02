import { CustomerController } from "./customer.controller";
import { CustomerGuard } from "./customer.guard";
import { jwtSecret } from "./jwt-config";
import { StaffGuard } from "./access.guard";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./twofactor.service";
import { JwtStrategy } from "./jwt.strategy";

@Global()
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { expiresIn: "8h" },
      }),
    }),
  ],
  controllers: [AuthController, CustomerController],
  providers: [CustomerGuard, AuthService, JwtStrategy, StaffGuard, TwoFactorService],
  exports: [AuthService, JwtModule, StaffGuard],
})
export class AuthModule {}
