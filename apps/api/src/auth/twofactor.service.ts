import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

type TwoFactorResponse = {
  status?: string;
  Status?: string;
  session_id?: string;
  code?: string | number;
  error_code?: string | number;
  message?: string;
  Details?: string;
  error?: string;
};

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  async sendOtp(phone: string, otp: string): Promise<void> {
    const apiKey = process.env.TWOFACTOR_API_KEY?.trim();
    if (!apiKey)
      throw new ServiceUnavailableException("OTP delivery is not configured");

    const senderId = process.env.TWOFACTOR_SENDER_ID?.trim();
    if (!senderId)
      throw new ServiceUnavailableException(
        "SMS sender ID is not configured",
      );

    // Use 2Factor's transactional text-SMS endpoint. Their OTP endpoint can
    // fall back to a voice call; this endpoint sends a message body directly.
    // Keep this text aligned with the currently approved sender/template.
    const messageTemplate =
      process.env.TWOFACTOR_SMS_MESSAGE ||
      "XXXX is your OTP to verify phone number at 2Factor.in. Please do not share OTP with anyone.";
    if (!messageTemplate.includes("XXXX"))
      throw new ServiceUnavailableException(
        "SMS template must contain the XXXX OTP placeholder",
      );
    const message = messageTemplate.replace("XXXX", otp);
    const url = new URL(
      `/API/V1/${encodeURIComponent(apiKey)}/ADDON_SERVICES/SEND/TSMS`,
      "https://2factor.in",
    );
    let providerFailure = "request failed";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: senderId,
          To: `+91${phone}`,
          Msg: message,
          SendAt: "",
        }),
        signal: AbortSignal.timeout(10000),
      });
      const text = await response.text();
      let result: TwoFactorResponse = {};
      try {
        result = JSON.parse(text) as TwoFactorResponse;
      } catch {
        providerFailure = "provider returned a non-JSON response";
      }
      const status = (result.status || result.Status || "").toLowerCase();
      if (response.ok && (status === "success" || status === "sent")) return;

      const code = String(result.error_code ?? result.code ?? "").replace(
        /[^a-zA-Z0-9_-]/g,
        "",
      );
      const reason = String(
        result.message || result.Details || result.error || "",
      )
        .replaceAll(apiKey, "[redacted]")
        .replaceAll(otp, "[redacted]")
        .replaceAll(`+91${phone}`, "[phone]")
        .replaceAll(phone, "[phone]")
        .replace(/[\r\n\t]/g, " ")
        .slice(0, 160);
      providerFailure = `HTTP ${response.status}; status=${status || "unknown"}; code=${code || "none"}; ${reason || "no provider detail"}`;
    } catch {
      providerFailure = "network request failed or timed out";
    }
    {
      // The URL contains the provider key and OTP. Never log it or expose the
      // provider response verbatim. Only sanitized status details are logged.
      this.logger.warn(`2Factor SMS request failed: ${providerFailure}`);
    }
    throw new ServiceUnavailableException(
      "OTP could not be delivered. Please try again.",
    );
  }
}
