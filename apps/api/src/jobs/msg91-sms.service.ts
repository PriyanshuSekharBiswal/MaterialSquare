import { Injectable } from "@nestjs/common";

type SmsJobName =
  | "quote-published"
  | "quote-expiry-reminder"
  | "quote-follow-up"
  | "dispatch-whatsapp-alert";

type JobPayload = Record<string, unknown>;

const TEMPLATE_ENV: Record<SmsJobName, string> = {
  "quote-published": "MSG91_SMS_TEMPLATE_ID_QUOTE_PUBLISHED",
  "quote-expiry-reminder": "MSG91_SMS_TEMPLATE_ID_QUOTE_EXPIRY_REMINDER",
  "quote-follow-up": "MSG91_SMS_TEMPLATE_ID_QUOTE_FOLLOW_UP",
  "dispatch-whatsapp-alert": "MSG91_SMS_TEMPLATE_ID_DISPATCH_UPDATE",
};

@Injectable()
export class Msg91SmsService {
  getMissingConfiguration(
    required: SmsJobName[] = Object.keys(TEMPLATE_ENV) as SmsJobName[],
  ) {
    const missing: string[] = [];
    if (!process.env.MSG91_AUTHKEY?.trim()) missing.push("MSG91_AUTHKEY");
    for (const type of required) {
      if (!process.env[TEMPLATE_ENV[type]]?.trim())
        missing.push(TEMPLATE_ENV[type]);
    }
    return missing;
  }

  isConfigured(required?: SmsJobName[]) {
    return this.getMissingConfiguration(required).length === 0;
  }

  hasTemplate(type: string) {
    return (
      type in TEMPLATE_ENV &&
      Boolean(process.env[TEMPLATE_ENV[type as SmsJobName]]?.trim())
    );
  }

  async send(type: string, payload: JobPayload, idempotencyKey: string) {
    if (!(type in TEMPLATE_ENV))
      throw new Error(`MSG91 SMS does not support ${type}`);
    const smsType = type as SmsJobName;
    const authkey = process.env.MSG91_AUTHKEY?.trim();
    const templateId = process.env[TEMPLATE_ENV[smsType]]?.trim();
    if (!authkey || !templateId)
      throw new Error(`MSG91 SMS is not configured for ${type}`);

    const phone = normalizeIndianMobile(payload.phone);
    const variables = getTemplateVariables(smsType, payload);
    const recipient: Record<string, string> = { mobiles: phone };
    variables.forEach((value, index) => {
      recipient[`VAR${index + 1}`] = value;
    });

    const response = await fetch("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: {
        accept: "application/json",
        authkey,
        "content-type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [recipient],
      }),
      signal: AbortSignal.timeout(10000),
    });

    const responseText = await response.text();
    if (!response.ok) throw new Error(`MSG91 SMS returned ${response.status}`);
    if (responseText) {
      try {
        const result = JSON.parse(responseText) as {
          type?: string;
          message?: string;
        };
        if (result.type?.toLowerCase() === "error")
          throw new Error(
            `MSG91 SMS rejected the request${result.message ? `: ${result.message}` : ""}`,
          );
      } catch (error) {
        if (error instanceof SyntaxError) return;
        throw error;
      }
    }
  }
}

function normalizeIndianMobile(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  if (!/^91[6-9]\d{9}$/.test(normalized))
    throw new Error("A valid Indian mobile number is required for MSG91 SMS");
  return normalized;
}

function getTemplateVariables(type: SmsJobName, payload: JobPayload) {
  const value = (key: string) => String(payload[key] ?? "").trim();
  const required = (key: string) => {
    const result = value(key);
    if (!result) throw new Error(`Notification is missing ${key}`);
    return result;
  };
  switch (type) {
    case "quote-published":
    case "quote-expiry-reminder":
      return [required("quoteNumber"), formatDate(required("validUntil"))];
    case "quote-follow-up":
      return [required("quoteNumber")];
    case "dispatch-whatsapp-alert":
      return [
        required("orderNumber"),
        required("status"),
        value("truckNo") || "Not assigned",
      ];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    throw new Error("Notification has an invalid valid-until date");
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
