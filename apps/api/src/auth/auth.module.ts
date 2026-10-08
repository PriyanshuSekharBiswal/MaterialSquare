import { jwtSecret } from "./jwt-config";
import { StaffGuard } from "./access.guard";
import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { QuotesModule } from "../quotes/quotes.module";
import { PdfModule } from "../pdf/pdf.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { StaffManagementController } from "./staff-management.controller";
import { CustomerController } from "./customer.controller";
import { CustomerGuard } from "./customer.guard";
import { Msg91WidgetService } from "./msg91-widget.service";
import { RecentlyDeletedController } from "./recently-deleted.controller";
import { StorageModule } from "../storage/storage.module";

@Global()
@Module({
  imports: [
    QuotesModule,
    PdfModule,
    StorageModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: jwtSecret(),
        // Admin sign-in is remembered by the admin app across browser restarts.
        // Keep a finite server-side lifetime so abandoned devices still expire.
        signOptions: { expiresIn: "30d" },
      }),
    }),
  ],
  controllers: [
    AuthController,
    CustomerController,
    StaffManagementController,
    RecentlyDeletedController,
  ],
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
