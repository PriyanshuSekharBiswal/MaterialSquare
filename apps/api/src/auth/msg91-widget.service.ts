import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class Msg91WidgetService {
  private readonly logger = new Logger(Msg91WidgetService.name);

  async verifyAccessToken(accessToken: string): Promise<string> {
    const authkey = process.env.MSG91_AUTHKEY?.trim();
    if (!authkey)
      throw new ServiceUnavailableException(
        "Phone verification is not configured yet",
      );
    try {
      const response = await fetch(
        "https://control.msg91.com/api/v5/widget/verifyAccessToken",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authkey, "access-token": accessToken }),
          signal: AbortSignal.timeout(10000),
        },
      );
      const result = (await response.json()) as {
        type?: string;
        message?: string;
      };
      const match = result.message
        ?.replace(/^\+/, "")
        .match(/^91([6-9]\d{9})$/);
      if (!response.ok || result.type?.toLowerCase() !== "success" || !match)
        throw new UnauthorizedException(
          "Invalid or expired phone verification",
        );
      return match[1];
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      this.logger.warn("MSG91 access-token verification failed");
      throw new ServiceUnavailableException(
        "Could not verify your phone. Please try again.",
      );
    }
  }
}
