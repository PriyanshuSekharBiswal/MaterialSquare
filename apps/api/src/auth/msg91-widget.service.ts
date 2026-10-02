import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

type Msg91VerifyResponse = {
  type?: string;
  message?: string;
};

@Injectable()
export class Msg91WidgetService {
  private readonly logger = new Logger(Msg91WidgetService.name);

  async verifyAccessToken(accessToken: string): Promise<string> {
    const authkey = process.env.MSG91_AUTHKEY?.trim();
    if (!authkey)
      throw new ServiceUnavailableException(
        "OTP verification is not configured",
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
      const result = (await response.json()) as Msg91VerifyResponse;
      if (!response.ok || result.type?.toLowerCase() !== "success")
        throw new UnauthorizedException("Invalid or expired OTP verification");

      const verifiedPhone = result.message?.replace(/^\+/, "");
      const match = verifiedPhone?.match(/^91([6-9]\d{9})$/);
      if (!match)
        throw new UnauthorizedException("Invalid or expired OTP verification");
      return match[1];
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      this.logger.warn("MSG91 access-token verification failed");
      throw new ServiceUnavailableException(
        "Could not verify OTP. Please try again.",
      );
    }
  }
}
