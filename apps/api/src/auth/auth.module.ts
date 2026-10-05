import { jwtSecret } from "./jwt-config";
import { StaffGuard } from "./access.guard";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { QuotesModule } from "../quotes/quotes.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StaffManagementController } from "./staff-management.controller";
import { CustomerController } from "./customer.controller";
import { CustomerGuard } from "./customer.guard";
import { Msg91WidgetService } from "./msg91-widget.service";

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
    AuthService,
    JwtStrategy,
    StaffGuard,
    CustomerGuard,
    Msg91WidgetService,
  ],
  exports: [JwtModule, StaffGuard, CustomerGuard],
})
export class AuthModule {}
