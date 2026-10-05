import { CustomerController } from "./customer.controller";
import { CustomerGuard } from "./customer.guard";
import { jwtSecret } from "./jwt-config";
import { StaffGuard } from "./access.guard";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { Msg91WidgetService } from "./msg91-widget.service";
import { JwtStrategy } from "./jwt.strategy";
import { StaffManagementController } from "./staff-management.controller";
import { QuotesModule } from "../quotes/quotes.module";

@Global()
@Module({
  imports: [
    QuotesModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        signOptions: { expiresIn: "8h" },
      }),
    }),
  ],
  controllers: [AuthController, CustomerController, StaffManagementController],
  providers: [
    CustomerGuard,
    AuthService,
    JwtStrategy,
    StaffGuard,
    Msg91WidgetService,
  ],
  exports: [AuthService, JwtModule, StaffGuard],
})
export class AuthModule {}
