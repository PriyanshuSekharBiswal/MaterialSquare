import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
@Injectable()
export class StaffGuard extends AuthGuard("jwt") {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    if (context.switchToHttp().getRequest().user.type !== "STAFF")
      throw new ForbiddenException("Staff access required");
    return true;
  }
}
