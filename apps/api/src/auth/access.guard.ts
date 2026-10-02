import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { assertStaffRoutePermission } from "./staff-access";
@Injectable()
export class StaffGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (request.user.type !== "STAFF")
      throw new ForbiddenException("Staff access required");
    assertStaffRoutePermission(
      request.method,
      request.originalUrl || request.url,
      request.user.role,
    );
    return true;
  }
}
